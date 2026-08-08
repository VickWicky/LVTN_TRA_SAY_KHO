<!DOCTYPE html>
<html>
<head>
    <title>Hoàn tiền thành công</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { color: #2E7D32; }
        .content { background: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #c8e6c9; }
        .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hoàn tiền thành công!</h1>
        </div>

        <div class="content">
            <p>Chào bạn <strong>{{ $order->shipping_name }}</strong>,</p>
            <p>Tin vui! Hệ thống thanh toán VNPAY đã xác nhận hoàn tiền thành công cho đơn hàng <strong>#{{ $order->order_code }}</strong> của bạn.</p>
            <p>Số tiền <strong>{{ number_format($order->final_amount, 0, ',', '.') }} VNĐ</strong> đã được chuyển trả về tài khoản mà bạn dùng để thanh toán.</p>
            <p>Thời gian ghi nhận: {{ \Carbon\Carbon::parse($order->refunded_at)->format('d/m/Y H:i:s') }}</p>
            <p><em>(Tùy thuộc vào ngân hàng phát hành thẻ của bạn, tiền có thể nổi trong tài khoản ngay lập tức hoặc chậm nhất trong 1-2 ngày làm việc).</em></p>
        </div>

        <div class="footer">
            <p>Cảm ơn bạn đã quan tâm và mua sắm tại CK Tea. Rất mong được phục vụ bạn trong những lần tới!</p>
            <p>Hotline: 0123.456.789</p>
            <p>&copy; {{ date('Y') }} CK Tea. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
