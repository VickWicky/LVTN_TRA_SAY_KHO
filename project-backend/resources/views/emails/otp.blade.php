<x-mail::message>
# Xin chào,

Cảm ơn bạn đã đăng ký tài khoản tại hệ thống **CK Tea**.
Vui lòng sử dụng mã số gồm 6 chữ số dưới đây để xác thực địa chỉ email của bạn:

<x-mail::panel>
# {{ $otp }}
</x-mail::panel>

*Lưu ý: Mã xác nhận này chỉ có hiệu lực trong vòng 5 phút.*

Nếu bạn không yêu cầu tạo tài khoản, xin vui lòng bỏ qua email này.

Trân trọng,<br>
Đội ngũ {{ config('app.name') }}
</x-mail::message>
