<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    // List all roles with their permissions
    public function index()
    {
        $roles = Role::with('permissions')->get();
        
        $roles->transform(function ($role) {
            $role->users_count = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->where('role_id', $role->id)
                ->count();
            return $role;
        });

        return response()->json($roles);
    }

    // List all available permissions
    public function permissions()
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }

    // Create a new role
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:roles,name|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        $role = Role::create(['name' => $request->name]);
        
        if ($request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }

        return response()->json([
            'message' => 'Tạo vai trò thành công',
            'role' => $role->load('permissions')
        ], 201);
    }

    // Update a role
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        $role = Role::findOrFail($id);
        
        $coreRoles = ['admin', 'customer'];
        if (in_array($role->name, $coreRoles) && $request->name !== $role->name) {
            return response()->json(['message' => 'Không thể đổi tên vai trò cốt lõi của hệ thống!'], 403);
        }

        $role->name = $request->name;
        $role->save();

        if ($request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }

        return response()->json([
            'message' => 'Cập nhật vai trò thành công',
            'role' => $role->load('permissions')
        ]);
    }

    // Delete a role
    public function destroy($id)
    {
        $role = Role::findOrFail($id);
        
        $coreRoles = ['admin', 'staff', 'sales', 'customer'];
        if (in_array($role->name, $coreRoles)) {
            return response()->json(['message' => 'Không thể xóa các vai trò cốt lõi của hệ thống!'], 403);
        }

        if ($role->users()->count() > 0) {
            return response()->json(['message' => 'Không thể xóa vai trò đang được gán cho người dùng!'], 403);
        }

        $role->delete();

        return response()->json(['message' => 'Đã xóa vai trò thành công!']);
    }
}
