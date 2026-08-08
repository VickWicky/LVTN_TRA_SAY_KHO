<!DOCTYPE html>
<html>
<head>
    <title>Xác nhận đơn hàng</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { color: #2E7D32; }
        .order-info { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; font-size: 1.2em; color: #d32f2f; }
        .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cảm ơn bạn đã mua hàng tại CK Tea!</h1>
            <p>Đơn hàng của bạn đã được tiếp nhận và đang trong quá trình xử lý.</p>
        </div>

        <div class="order-info">
            <h3>Thông tin đơn hàng: #{{ $order->order_code }}</h3>
            <p><strong>Khách hàng:</strong> {{ $order->shipping_name }}</p>
            <p><strong>Số điện thoại:</strong> {{ $order->shipping_phone }}</p>
            <p><strong>Địa chỉ giao hàng:</strong> {{ $order->shipping_address }}</p>
            <p><strong>Hình thức thanh toán:</strong> {{ strtoupper($order->payment_method) }}</p>
            <p><strong>Ngày đặt:</strong> {{ $order->created_at->format('d/m/Y H:i') }}</p>
        </div>

        <h3>Chi tiết sản phẩm</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Sản phẩm</th>
                    <th>SL</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $item)
                <tr>
                    <td>{{ $item->variant->product->name ?? 'Sản phẩm' }} ({{ $item->variant->weight ?? '' }}g)</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ number_format($item->price, 0, ',', '.') }}đ</td>
                    <td>{{ number_format($item->price * $item->quantity, 0, ',', '.') }}đ</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="total">
            Tổng cộng: {{ number_format($order->final_amount, 0, ',', '.') }} VNĐ
        </div>

        <div class="footer">
            <p>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để xác nhận giao hàng.</p>
            <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ Hotline: 0123.456.789</p>
            <p>&copy; {{ date('Y') }} CK Tea. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
