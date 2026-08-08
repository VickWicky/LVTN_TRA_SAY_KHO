<x-mail::message>
# Xin chào,

Cảm ơn bạn đã sử dụng dịch vụ tại hệ thống **CK Tea**.

@if($type === 'reset_password')
Vui lòng sử dụng mã số gồm 6 chữ số dưới đây để đặt lại mật khẩu của bạn:
@else
Vui lòng sử dụng mã số gồm 6 chữ số dưới đây để xác thực địa chỉ email của bạn:
@endif

<x-mail::panel>
# {{ $otp }}
</x-mail::panel>

*Lưu ý: Mã xác nhận này chỉ có hiệu lực trong vòng 5 phút.*

@if($type === 'reset_password')
Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ để bảo vệ tài khoản.
@else
Nếu bạn không yêu cầu tạo tài khoản, xin vui lòng bỏ qua email này.
@endif

Trân trọng,<br>
Đội ngũ {{ config('app.name') }}
</x-mail::message>
