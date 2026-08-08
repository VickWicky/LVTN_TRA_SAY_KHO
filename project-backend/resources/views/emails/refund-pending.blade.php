<!DOCTYPE html>
<html>
<head>
    <title>Thông báo hủy đơn hàng</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { color: #f57c00; }
        .content { background: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #ffe0b2; }
        .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Đơn hàng của bạn đã được hủy!</h1>
        </div>

        <div class="content">
            <p>Chào bạn <strong>{{ $order->shipping_name }}</strong>,</p>
            <p>Đơn hàng <strong>#{{ $order->order_code }}</strong> của bạn đã được hủy thành công theo yêu cầu.</p>
            <p>Do bạn đã thanh toán trực tuyến qua cổng VNPAY với số tiền là <strong>{{ number_format($order->final_amount, 0, ',', '.') }} VNĐ</strong>, chúng tôi đã ghi nhận yêu cầu hoàn tiền của bạn.</p>
            <p><em>Lưu ý: Theo quy định của cổng thanh toán, giao dịch hoàn tiền có thể mất từ 24h đến 48h để xử lý. Vui lòng kiên nhẫn chờ đợi, chúng tôi sẽ gửi email thông báo ngay khi tiền được hoàn thành công.</em></p>
        </div>

        <div class="footer">
            <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ Hotline: 0123.456.789</p>
            <p>&copy; {{ date('Y') }} CK Tea. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
