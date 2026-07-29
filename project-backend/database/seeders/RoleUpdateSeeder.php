<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RoleUpdateSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Tạo thêm các Permission mới
        $newPermissions = [
            'view-users',
            'view-products',
            'view-categories',
            'manage-contacts',
        ];

        foreach ($newPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // 2. Cập nhật lại quyền cho Admin (Admin có tất cả quyền)
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        // 3. Cập nhật lại quyền cho Staff (Nhân viên Kho)
        // Staff quản lý: sản phẩm, danh mục, kho, đơn hàng, dashboard
        // Thu hồi quyền manage-contacts, view-users nếu vô tình có
        $staffRole = Role::firstOrCreate(['name' => 'staff']);
        $staffRole->syncPermissions([
            'manage-products', 'view-products',
            'manage-categories', 'view-categories',
            'manage-orders', 
            'manage-import', 
            'view-dashboard',
        ]);

        // 4. Tạo Role Sales (Nhân viên bán hàng)
        $salesRole = Role::firstOrCreate(['name' => 'sales']);
        $salesRole->syncPermissions([
            'manage-orders',       // Xử lý đơn hàng
            'manage-contacts',     // Quản lý liên hệ
            'view-users',          // Xem danh sách KH
            'view-products',       // Xem sản phẩm
            'view-categories',     // Xem danh mục
            'view-dashboard',
        ]);

        // 5. Tạo 1 user mẫu cho Sales để test
        $salesUser = User::firstOrCreate(
            ['email' => 'sales@cktea.com'],
            [
                'name' => 'Nhân viên Sales',
                'password' => Hash::make('password123'),
                'phone' => '0988888888',
                'address' => 'Văn phòng CKTek',
            ]
        );
        $salesUser->assignRole('sales');

        $this->command->info('Đã cập nhật các quyền và thêm Role Sales thành công!');
    }
}
