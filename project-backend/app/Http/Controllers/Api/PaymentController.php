<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Services\VNPayService;

class PaymentController extends Controller
{
    protected $vnPayService;

    public function __construct(VNPayService $vnPayService)
    {
        $this->vnPayService = $vnPayService;
    }

    public function createVnpayUrl(Request $request)
    {
        $request->validate([
            'order_id' => 'nullable|exists:orders,id',
            'order_code' => 'nullable|exists:orders,order_code'
        ]);

        if (!$request->order_id && !$request->order_code) {
            return response()->json(['success' => false, 'message' => 'Vui lòng cung cấp order_id hoặc order_code'], 400);
        }

        if ($request->order_id) {
            $order = Order::findOrFail($request->order_id);
        } else {
            $order = Order::where('order_code', $request->order_code)->firstOrFail();
        }
        
        // Tạo URL thanh toán
        $vnpayUrl = $this->vnPayService->createPaymentUrl(
            $order->order_code, 
            $order->final_amount,
            "Thanh toan don hang {$order->order_code}"
        );

        return response()->json([
            'success' => true,
            'vnpay_url' => $vnpayUrl
        ]);
    }

    public function verifyVnpay(Request $request)
    {
        $inputData = $request->all();
        $result = $this->vnPayService->verifyPayment($inputData);

        if ($result['success']) {
            $order = Order::where('order_code', $result['orderCode'])->first();
            if ($order && $order->payment_status !== 'paid') {
                $order->payment_status = 'paid';
                $order->save();
            }
            return response()->json(['success' => true, 'message' => 'Thanh toán thành công']);
        }

        return response()->json(['success' => false, 'message' => $result['message']], 400);
    }
}
