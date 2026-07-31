<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\Batch;
use App\Events\OrderCreated;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validate request
        $validated = $request->validate([
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string',
            'payment_method' => 'required|string|in:cod,vnpay',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $totalAmount = 0;
            $orderItemsData = [];

            // 2. Tính toán giá trị và Trừ Tồn Kho (FEFO)
            foreach ($validated['items'] as $item) {
                $variant = ProductVariant::with('product')->findOrFail($item['variant_id']);
                
                // Kiểm tra sản phẩm có đang kinh doanh không
                if (!$variant->product || !$variant->product->is_active) {
                    $productName = $variant->product ? $variant->product->name : 'Sản phẩm';
                    throw new \Exception("{$productName} hiện đã ngừng kinh doanh. Vui lòng xóa khỏi giỏ hàng.");
                }

                // Kiểm tra tổng tồn kho
                if ($variant->total_stock < $item['quantity']) {
                    throw new \Exception("Sản phẩm {$variant->product->name} (Biến thể {$variant->weight}g) không đủ số lượng trong kho.");
                }

                // Sử dụng PromotionService để tính giá thay vì lấy giá trị ảo không tồn tại
                $promotionService = new \App\Services\PromotionService();
                $promoData = $promotionService->getBestPromotionForVariant($variant, $variant->product->category_id, $variant->product->id);
                
                $price = $promoData['sale_price'] !== null ? $promoData['sale_price'] : $variant->price;
                $promotionId = $promoData['promotion_id'];

                $quantityNeeded = $item['quantity'];
                
                $totalAmount += $price * $quantityNeeded;

                // Lấy các lô hàng còn hạn sử dụng, sắp xếp theo HSD tăng dần (FEFO)
                $batches = Batch::where('variant_id', $variant->id)
                    ->where('expiry_date', '>', now())
                    ->where('stock', '>', 0)
                    ->orderBy('expiry_date', 'asc')
                    ->lockForUpdate() // Khóa dòng để tránh xung đột concurrent
                    ->get();

                foreach ($batches as $batch) {
                    if ($quantityNeeded <= 0) break;

                    $takeQuantity = min($batch->stock, $quantityNeeded);
                    if ($takeQuantity <= 0) continue; // Skip if stock is zero due to concurrency
                    
                    // Trừ stock trong batch
                    $batch->stock -= $takeQuantity;
                    $batch->save();

                    // Đưa vào mảng chi tiết đơn hàng
                    $orderItemsData[] = [
                        'variant_id' => $variant->id,
                        'batch_id' => $batch->id,
                        'promotion_id' => $promotionId, // Lưu id khuyến mãi
                        'quantity' => $takeQuantity,
                        'price' => $price,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    $quantityNeeded -= $takeQuantity;
                }

                if ($quantityNeeded > 0) {
                    throw new \Exception("Sản phẩm {$variant->product->name} (Biến thể {$variant->weight}g) đã hết hàng trong kho. Vui lòng tải lại trang!");
                }
            }

            $discountAmount = 0;
            $finalAmount = $totalAmount - $discountAmount;

            $user_id = null;
            if (auth('sanctum')->check()) {
                $user_id = auth('sanctum')->id();
            }

            // 3. Tạo đơn hàng
            $order = Order::create([
                'user_id' => $user_id,
                'order_code' => 'CK-' . strtoupper(Str::random(6)),
                'total_amount' => $totalAmount,
                'discount_amount' => $discountAmount,
                'final_amount' => $finalAmount,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'pending',
                'order_status' => 'pending',
                'shipping_name' => $validated['shipping_name'],
                'shipping_phone' => $validated['shipping_phone'],
                'shipping_address' => $validated['shipping_address'],
            ]);

            // 4. Tạo chi tiết đơn hàng
            foreach ($orderItemsData as $itemData) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'variant_id' => $itemData['variant_id'],
                    'batch_id' => $itemData['batch_id'],
                    'quantity' => $itemData['quantity'],
                    'price' => $itemData['price'],
                ]);
            }

            DB::commit();

            // Phát event báo có đơn hàng mới qua Pusher/Reverb
            event(new OrderCreated($order));

            return response()->json([
                'message' => 'Đặt hàng thành công',
                'order' => $order->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Lỗi khi đặt hàng',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function userOrders(Request $request)
    {
        $user_id = $request->user()->id;
        $orders = Order::with('items.variant.product')
            ->where('user_id', $user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    public function cancelOrder(Request $request, $id)
    {
        $user_id = $request->user()->id;
        $order = Order::with('items')->where('user_id', $user_id)->findOrFail($id);

        if ($order->order_status !== 'pending') {
            return response()->json([
                'message' => 'Không thể hủy đơn hàng này vì nó đã được xử lý.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $order->order_status = 'cancelled';

            // VNPay Refund
            if ($order->payment_method === 'vnpay' && $order->payment_status === 'paid') {
                $vnPayService = app(\App\Services\VNPayService::class);
                $refundResult = $vnPayService->refund($order->order_code, $order->final_amount, $order->created_at, $request->user()->name ?? 'Khach hang');
                
                if ($refundResult['success']) {
                    $order->payment_status = 'refunded';
                } else {
                    throw new \Exception("Lỗi hoàn tiền VNPay: " . $refundResult['message']);
                }
            }

            // Hoàn lại tồn kho
            foreach ($order->items as $item) {
                if ($item->batch_id) {
                    $batch = Batch::lockForUpdate()->find($item->batch_id);
                    if ($batch) {
                        $batch->stock += $item->quantity;
                        $batch->save();
                    }
                }
            }

            $order->save();

            DB::commit();

            return response()->json([
                'message' => 'Đã hủy đơn hàng thành công.',
                'order' => $order->load('items.variant.product')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Có lỗi xảy ra khi hủy đơn hàng.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateShipping(Request $request, $id)
    {
        $request->validate([
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string',
        ]);

        $user_id = $request->user()->id;
        $order = Order::where('user_id', $user_id)->findOrFail($id);

        if (!in_array($order->order_status, ['pending', 'processing'])) {
            return response()->json([
                'message' => 'Không thể thay đổi thông tin giao hàng khi đơn hàng đã được xử lý hoặc bị hủy.'
            ], 400);
        }

        $order->update([
            'shipping_name' => $request->shipping_name,
            'shipping_phone' => $request->shipping_phone,
            'shipping_address' => $request->shipping_address,
        ]);

        event(new \App\Events\OrderUpdated($order));

        return response()->json([
            'message' => 'Cập nhật thông tin giao hàng thành công',
            'order' => $order
        ]);
    }
}
