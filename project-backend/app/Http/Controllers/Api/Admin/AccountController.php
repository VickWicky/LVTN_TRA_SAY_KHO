<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AccountController extends Controller
{
    /**
     * Get all users with their roles
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $query = User::with('roles')
            ->orderBy('created_at', 'desc');

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
        }

        // Phân trang 10 users mỗi trang
        $users = $query->paginate($request->get('per_page', 10));
        
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:users,name',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
            'role' => 'required|string|exists:roles,name'
        ], [
            'name.unique' => 'Tên người dùng này đã tồn tại trong hệ thống.',
            'email.unique' => 'Địa chỉ email này đã được sử dụng.'
        ]);

        if ($request->role === 'customer') {
            return response()->json(['message' => 'Không thể tạo tài khoản khách hàng từ trang Admin.'], 403);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'is_active' => true
        ]);

        $user->assignRole($request->role);

        return response()->json([
            'message' => 'Tạo tài khoản nội bộ thành công!',
            'user' => $user->load('roles')
        ], 201);
    }

    /**
     * Update user account (info, password, role)
     */
    public function updateAccount(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:users,name,' . $id,
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
            'role' => 'required|string|exists:roles,name'
        ], [
            'name.unique' => 'Tên người dùng này đã tồn tại trong hệ thống.'
        ]);

        $user = User::findOrFail($id);
        
        // Cập nhật thông tin cơ bản
        $user->name = $request->name;
        $user->phone = $request->phone;
        
        // Cập nhật mật khẩu nếu có
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        // --- BẢO VỆ ROLE ---
        if ($request->has('role')) {
            $currentRole = $user->roles->first()->name ?? 'customer';
            $newRole = $request->role;

            if ($currentRole !== $newRole) {
                // Bảo vệ: Admin không thể tự đổi quyền của chính mình
                if ($user->id === auth()->id()) {
                    return response()->json(['message' => 'Bạn không thể tự thay đổi quyền của chính mình!'], 403);
                }

                // Bảo vệ: Nếu user hiện tại là Admin và đang bị giáng chức
                if ($user->hasRole('admin') && $newRole !== 'admin') {
                    // Kiểm tra xem hệ thống còn admin nào khác không
                    $adminCount = User::role('admin')->count();
                    if ($adminCount <= 1) {
                        return response()->json(['message' => 'Không thể hạ quyền vì đây là Quản trị viên duy nhất còn lại trên hệ thống!'], 403);
                    }
                }
                
                // Cập nhật role
                if ($newRole === 'customer') {
                    $user->syncRoles([]);
                } else {
                    $user->syncRoles([$newRole]);
                }
            }
        }
        
        $user->save();

        return response()->json([
            'message' => 'Cập nhật thông tin tài khoản thành công!',
            'user' => $user->load('roles')
        ]);
    }

    /**
     * Update user active status
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Bạn không thể tự khóa tài khoản của chính mình!'], 403);
        }

        if ($user->hasRole('admin') && !$request->is_active) {
            $adminCount = User::role('admin')->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Không thể khóa Quản trị viên duy nhất còn lại trên hệ thống!'], 403);
            }
        }

        $user->is_active = $request->is_active;
        $user->save();

        return response()->json([
            'message' => $request->is_active ? 'Đã mở khóa tài khoản thành công!' : 'Đã khóa tài khoản thành công!',
            'user' => $user->load('roles')
        ]);
    }
}
