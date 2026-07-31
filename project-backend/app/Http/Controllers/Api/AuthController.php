<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    // 1. ĐĂNG KÝ TÀI KHOẢN (BƯỚC 1: GỬI OTP)
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:10', // Tối đa 10 số 
        ], [
            'email.unique' => 'Địa chỉ email này đã được sử dụng cho một tài khoản khác.',
            'email.email' => 'Địa chỉ email không đúng định dạng.',
            'password.min' => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'name.required' => 'Vui lòng nhập họ và tên.',
            'phone.max' => 'Số điện thoại không được vượt quá 10 số.'
        ]);

        // Tạo OTP 6 số ngẫu nhiên
        $otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Lưu thông tin đăng ký và OTP vào Cache trong 5 phút
        \Illuminate\Support\Facades\Cache::put('register_otp_' . $request->email, [
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'otp' => $otp
        ], now()->addMinutes(5));

        // Gửi email
        \Illuminate\Support\Facades\Mail::to($request->email)->send(new \App\Mail\OtpMail($otp));

        return response()->json([
            'message' => 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
            'require_otp' => true,
            'email' => $request->email
        ]);
    }

    // XÁC THỰC OTP (BƯỚC 2: TẠO TÀI KHOẢN)
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'otp' => 'required|string|size:6'
        ]);

        $cachedData = \Illuminate\Support\Facades\Cache::get('register_otp_' . $request->email);

        if (!$cachedData) {
            return response()->json(['message' => 'Mã OTP đã hết hạn hoặc không tồn tại.'], 400);
        }

        if ($cachedData['otp'] !== $request->otp) {
            return response()->json(['message' => 'Mã OTP không chính xác.'], 400);
        }

        // Tạo tài khoản chính thức
        $user = User::create([
            'name' => $cachedData['name'],
            'email' => $cachedData['email'],
            'password' => $cachedData['password'],
            'phone' => $cachedData['phone'],
        ]);

        // Gán role mặc định cho khách hàng
        $user->assignRole('customer');

        $token = $user->createToken('auth_token')->plainTextToken;

        // Xóa Cache sau khi đăng ký thành công
        \Illuminate\Support\Facades\Cache::forget('register_otp_' . $request->email);

        return response()->json([
            'message' => 'Đăng ký và xác thực thành công',
            'access_token' => $token,
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    // 2. ĐĂNG NHẬP TÀI KHOẢN THƯỜNG
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        // Kiểm tra xem user có tồn tại và mật khẩu có khớp không
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Tài khoản hoặc mật khẩu không chính xác'], 401);
        }

        // Kiểm tra xem tài khoản có bị khóa không
        if (!$user->is_active) {
            return response()->json(['message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công',
            'access_token' => $token,
            'user' => $user,
            'roles' => $user->getRoleNames(), // ['admin'], ['staff'], hoặc ['customer']
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    // 3. API NHẬN TOKEN TỪ GOOGLE (DO REACT GỬI LÊN)
    public function googleLogin(Request $request)
    {
        $request->validate([
            'access_token' => 'required|string',
        ]);

        try {
            // Dùng Socialite để lấy thông tin user từ Google Access Token
            $googleUser = Socialite::driver('google')->stateless()->userFromToken($request->access_token);

            // Tìm user trong Database, nếu chưa có thì tự động tạo mới
            $user = User::firstOrCreate(
                ['email' => $googleUser->getEmail()],
                [
                    'name' => $googleUser->getName(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    // Bỏ qua password vì đăng nhập bằng Google
                ]
            );

            // Gán role customer cho user Google mới tạo
            if ($user->wasRecentlyCreated) {
                $user->assignRole('customer');
            }

            // Kiểm tra xem tài khoản có bị khóa không
            if (!$user->is_active) {
                return response()->json(['message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!'], 403);
            }

            // Cấp phát Token của hệ thống mình cho React sử dụng
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Đăng nhập Google thành công',
                'access_token' => $token,
                'user' => $user,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Xác thực Google thất bại', 'error' => $e->getMessage()], 400);
        }
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        $user->name = $request->name;
        $user->phone = $request->phone;
        $user->address = $request->address;
        $user->save();

        return response()->json([
            'message' => 'Cập nhật thông tin thành công',
            'user' => $user
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        // Nếu user đăng nhập bằng Google (không có password), thì không cho đổi mật khẩu
        if (!$user->password && $user->google_id) {
            return response()->json(['message' => 'Tài khoản đăng nhập bằng Google không thể đổi mật khẩu.'], 400);
        }

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu hiện tại không chính xác.'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'message' => 'Đổi mật khẩu thành công.'
        ]);
    }
}