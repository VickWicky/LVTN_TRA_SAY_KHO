<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Batch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Lấy danh sách tất cả đơn hàng
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        
        $query = Order::with(['user', 'items.variant.product'])
            ->orderBy('created_at', 'desc');

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('order_code', 'like', "%{$search}%")
                  ->orWhere('shipping_name', 'like', "%{$search}%")
                  ->orWhere('shipping_phone', 'like', "%{$search}%");
            });
        }

        if ($status && $status !== 'all') {
            $query->where('order_status', $status);
        }

        return response()->json($query->paginate(10));
    }

    /**
     * Xem chi tiết một đơn hàng
     */
    public function show($id)
    {
        $order = Order::with(['user', 'items.variant.product', 'items.batch'])
            ->findOrFail($id);

        return response()->json($order);
    }

    /**
     * Cập nhật trạng thái đơn hàng
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:pending,processing,shipping,completed,cancelled,returned'
        ]);

        $order = Order::with('items')->findOrFail($id);
        $oldStatus = $order->order_status;
        $newStatus = $request->input('status');

        // Nếu trạng thái mới giống trạng thái cũ thì không cần làm gì
        if ($oldStatus === $newStatus) {
            return response()->json([
                'message' => 'Trạng thái không thay đổi.',
                'order' => $order
            ]);
        }

        // Logic kiểm tra không được nhảy bước
        $validTransitions = [
            'pending' => ['processing', 'cancelled'],
            'processing' => ['shipping', 'cancelled'],
            'shipping' => ['completed', 'returned'],
            'completed' => [],
            'cancelled' => [],
            'returned' => []
        ];

        if (!in_array($newStatus, $validTransitions[$oldStatus] ?? [])) {
            return response()->json([
                'message' => "Không thể chuyển trạng thái từ '$oldStatus' sang '$newStatus'. Vui lòng cập nhật đúng trình tự!"
            ], 400);
        }

        try {
            DB::beginTransaction();

            $order->order_status = $newStatus;

            // Nếu trạng thái mới là 'cancelled', tiến hành hoàn trả tồn kho và hoàn tiền VNPay
            if ($newStatus === 'cancelled') {
                // VNPay Refund
                if ($order->payment_method === 'vnpay' && $order->payment_status === 'paid') {
                    $vnPayService = app(\App\Services\VNPayService::class);
                    $refundResult = $vnPayService->refund($order->order_code, $order->final_amount, $order->created_at, request()->user()->name ?? 'Admin');
                    
                    if ($refundResult['success']) {
                        $order->payment_status = 'refunded';
                        $order->refunded_at = now();
                        if ($order->user && $order->user->email) {
                            try {
                                \Illuminate\Support\Facades\Mail::to($order->user->email)->send(new \App\Mail\RefundCompletedMail($order));
                            } catch (\Exception $e) {}
                        }
                    } else {
                        // Thất bại (chưa đủ 24h): KHÔNG NÉM LỖI
                        \Illuminate\Support\Facades\Log::warning("Admin Hủy đơn: Không thể hoàn tiền ngay VNPAY: " . $refundResult['message']);
                        if ($order->user && $order->user->email) {
                            try {
                                \Illuminate\Support\Facades\Mail::to($order->user->email)->send(new \App\Mail\RefundPendingMail($order));
                            } catch (\Exception $e) {}
                        }
                    }
                }

                foreach ($order->items as $item) {
                    if ($item->batch_id) {
                        $batch = Batch::lockForUpdate()->find($item->batch_id);
                        if ($batch) {
                            $batch->stock += $item->quantity;
                            $batch->save();
                        }
                    }
                }
            }

            $order->save();

            event(new \App\Events\OrderUpdated($order, "Đơn hàng {$order->order_code} vừa được cập nhật trạng thái"));

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật trạng thái đơn hàng thành công.',
                'order' => $order->load(['user', 'items.variant.product'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Order Status Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Có lỗi xảy ra khi cập nhật trạng thái đơn hàng.',
                'error' => $e->getMessage()
            ], 500);
        }
    }



    /**
     * Cập nhật trạng thái thanh toán
     */
    public function updatePaymentStatus(Request $request, $id)
    {
        $request->validate([
            'payment_status' => 'required|string|in:pending,paid,refunded,failed'
        ]);

        $order = Order::findOrFail($id);

        if ($order->payment_method === 'vnpay' && $order->payment_status === 'paid') {
            return response()->json(['message' => 'Không thể thay đổi trạng thái thanh toán của đơn hàng VNPay đã thanh toán.'], 400);
        }

        if ($order->payment_method === 'cod' && $order->order_status === 'completed') {
            return response()->json(['message' => 'Không thể thay đổi trạng thái thanh toán của đơn hàng COD đã hoàn thành.'], 400);
        }

        $order->payment_status = $request->input('payment_status');
        $order->save();

        event(new \App\Events\OrderUpdated($order, "Đơn hàng {$order->order_code} vừa cập nhật trạng thái thanh toán"));

        return response()->json([
            'message' => 'Cập nhật trạng thái thanh toán thành công',
            'order' => $order
        ]);
    }

    public function updateShipping(Request $request, $id)
    {
        $request->validate([
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string',
        ]);

        $order = Order::findOrFail($id);

        if (in_array($order->order_status, ['completed', 'cancelled', 'returned'])) {
            return response()->json([
                'message' => 'Không thể thay đổi thông tin giao hàng vì đơn hàng đã kết thúc.'
            ], 400);
        }

        $order->update([
            'shipping_name' => $request->shipping_name,
            'shipping_phone' => $request->shipping_phone,
            'shipping_address' => $request->shipping_address,
        ]);

        event(new \App\Events\OrderUpdated($order, "Đơn hàng {$order->order_code} vừa cập nhật thông tin giao hàng"));

        return response()->json([
            'message' => 'Cập nhật thông tin giao hàng thành công',
            'order' => $order
        ]);
    }

    /**
     * Nút thực hiện hoàn tiền VNPAY thủ công cho đơn đã hủy nhưng chưa hoàn tiền
     */
    public function retryRefund(Request $request, $id)
    {
        $order = Order::with('user')->findOrFail($id);

        if ($order->order_status !== 'cancelled') {
            return response()->json(['message' => 'Chỉ có thể hoàn tiền cho đơn hàng đã Hủy.'], 400);
        }

        if ($order->payment_method !== 'vnpay' || $order->payment_status !== 'paid') {
            return response()->json(['message' => 'Đơn hàng không đủ điều kiện hoàn tiền VNPAY.'], 400);
        }

        try {
            $vnPayService = app(\App\Services\VNPayService::class);
            $refundResult = $vnPayService->refund($order->order_code, $order->final_amount, $order->created_at, $request->user()->name ?? 'Admin');

            if ($refundResult['success']) {
                $order->payment_status = 'refunded';
                $order->refunded_at = now();
                $order->save();

                event(new \App\Events\OrderUpdated($order, "Đơn hàng {$order->order_code} đã được hoàn tiền VNPAY thành công"));

                if ($order->user && $order->user->email) {
                    try {
                        \Illuminate\Support\Facades\Mail::to($order->user->email)->send(new \App\Mail\RefundCompletedMail($order));
                    } catch (\Exception $e) {}
                }

                return response()->json([
                    'message' => 'Hoàn tiền VNPAY thành công!',
                    'order' => $order
                ]);
            } else {
                return response()->json([
                    'message' => 'Hoàn tiền VNPAY thất bại: ' . $refundResult['message']
                ], 400);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Retry Refund Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Có lỗi hệ thống khi gọi VNPAY.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
