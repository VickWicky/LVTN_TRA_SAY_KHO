<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class ShopSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // ========================================================
        // 1. TẠO ROLES & PERMISSIONS (RBAC)
        // ========================================================
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Tạo Permissions
        $permissions = [
            'manage-products',    // CRUD sản phẩm
            'manage-categories',  // CRUD danh mục
            'manage-orders',      // Quản lý đơn hàng
            'manage-import',      // Quản lý nhập kho
            'manage-users',       // Quản lý người dùng
            'view-dashboard',     // Xem dashboard thống kê
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Tạo Roles và gán Permissions
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all()); // Admin có tất cả quyền

        $staffRole = Role::create(['name' => 'staff']);
        $staffRole->givePermissionTo([
            'manage-products', 'manage-categories',
            'manage-orders', 'manage-import', 'view-dashboard',
        ]);

        $customerRole = Role::create(['name' => 'customer']);
        // Customer không cần permission đặc biệt

        // ========================================================
        // 2. TẠO USERS
        // ========================================================
        // Admin
        $admin = User::create([
            'name' => 'Admin CK TEA',
            'email' => 'admin@cktea.com',
            'password' => Hash::make('password123'),
            'phone' => '0987654321',
            'address' => '123 Nguyễn Huệ, Quận 1, TP.HCM',
        ]);
        $admin->assignRole('admin');

        // Staff (Nhân viên kho)
        $staff = User::create([
            'name' => 'Nguyễn Văn Minh',
            'email' => 'minh.nv@cktea.com',
            'password' => Hash::make('password123'),
            'phone' => '0901112233',
            'address' => '45 Lê Lợi, Quận 3, TP.HCM',
        ]);
        $staff->assignRole('staff');

        // Customers
        $customer1 = User::create([
            'name' => 'Trần Thị Lan',
            'email' => 'lan.tran@gmail.com',
            'password' => Hash::make('password123'),
            'phone' => '0912345678',
            'address' => '78 Trần Hưng Đạo, Quận 5, TP.HCM',
        ]);
        $customer1->assignRole('customer');

        $customer2 = User::create([
            'name' => 'Lê Hoàng Nam',
            'email' => 'nam.le@gmail.com',
            'password' => Hash::make('password123'),
            'phone' => '0923456789',
            'address' => '12 Phạm Văn Đồng, Thủ Đức, TP.HCM',
        ]);
        $customer2->assignRole('customer');

        $customer3 = User::create([
            'name' => 'Phạm Minh Anh',
            'email' => 'minhanh.pham@gmail.com',
            'password' => Hash::make('password123'),
            'phone' => '0934567890',
            'address' => '56 Hoàng Diệu, Quận 4, TP.HCM',
        ]);
        $customer3->assignRole('customer');

        // ========================================================
        // 3. TẠO DANH MỤC (CÓ DANH MỤC CON)
        // ========================================================
        $catTraId = DB::table('categories')->insertGetId([
            'name' => 'Trà', 'slug' => 'tra',
            'parent_id' => null, 'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $catOolongId = DB::table('categories')->insertGetId([
            'name' => 'Trà Oolong', 'slug' => 'tra-oolong',
            'parent_id' => $catTraId, 'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $catHoaId = DB::table('categories')->insertGetId([
            'name' => 'Trà Hoa', 'slug' => 'tra-hoa',
            'parent_id' => $catTraId, 'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $catXanhId = DB::table('categories')->insertGetId([
            'name' => 'Trà Xanh', 'slug' => 'tra-xanh',
            'parent_id' => $catTraId, 'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $catThaoMocId = DB::table('categories')->insertGetId([
            'name' => 'Trà Thảo Mộc', 'slug' => 'tra-thao-moc',
            'parent_id' => $catTraId, 'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // ========================================================
        // 4. TẠO SẢN PHẨM & BIẾN THỂ
        // ========================================================

        // --- SP1: Trà Oolong Sấy Lạnh Cao Cấp ---
        $prod1Id = DB::table('products')->insertGetId([
            'category_id' => $catOolongId,
            'name' => 'Trà Oolong Sấy Lạnh Cao Cấp',
            'slug' => 'tra-oolong-say-lanh-cao-cap',
            'description' => 'Trà Oolong thượng hạng từ vùng Cầu Đất, Đà Lạt. Sấy lạnh giữ nguyên hương vị và màu xanh tự nhiên. Vị ngọt hậu, hương thơm đặc trưng.',
            'thumbnail' => '/img/tra-oolong.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var1_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod1Id, 'sku' => 'OL-SL-100',
            'weight' => 100, 'price' => 120000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var1_250g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod1Id, 'sku' => 'OL-SL-250',
            'weight' => 250, 'price' => 280000, 'sale_price' => 250000,
            'sale_start_date' => $now->copy()->subDays(5), 'sale_end_date' => $now->copy()->addDays(25),
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var1_500g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod1Id, 'sku' => 'OL-SL-500',
            'weight' => 500, 'price' => 550000, 'sale_price' => 490000,
            'sale_start_date' => $now->copy()->subDays(5), 'sale_end_date' => $now->copy()->addDays(25),
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP2: Trà Hoa Cúc Mật Ong ---
        $prod2Id = DB::table('products')->insertGetId([
            'category_id' => $catHoaId,
            'name' => 'Trà Hoa Cúc Mật Ong',
            'slug' => 'tra-hoa-cuc-mat-ong',
            'description' => 'Hoa cúc sấy khô tự nhiên 100%, thanh nhiệt giải độc. Kết hợp mật ong giúp ngủ ngon, thư giãn tinh thần.',
            'thumbnail' => '/img/tra-hoa-cuc.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var2_50g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod2Id, 'sku' => 'HC-MO-050',
            'weight' => 50, 'price' => 65000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var2_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod2Id, 'sku' => 'HC-MO-100',
            'weight' => 100, 'price' => 120000, 'sale_price' => 99000,
            'sale_start_date' => $now->copy()->subDays(2), 'sale_end_date' => $now->copy()->addDays(28),
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP3: Trà Xanh Thái Nguyên ---
        $prod3Id = DB::table('products')->insertGetId([
            'category_id' => $catXanhId,
            'name' => 'Trà Xanh Thái Nguyên Đặc Biệt',
            'slug' => 'tra-xanh-thai-nguyen-dac-biet',
            'description' => 'Trà xanh Tân Cương, Thái Nguyên. Hái búp non 1 tôm 2 lá, sao suốt thủ công. Nước xanh trong, vị chát nhẹ, ngọt hậu.',
            'thumbnail' => '/img/tra-xanh.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var3_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod3Id, 'sku' => 'TX-TN-100',
            'weight' => 100, 'price' => 95000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var3_500g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod3Id, 'sku' => 'TX-TN-500',
            'weight' => 500, 'price' => 420000, 'sale_price' => 380000,
            'sale_start_date' => $now->copy(), 'sale_end_date' => $now->copy()->addDays(30),
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP4: Trà Hoa Hồng ---
        $prod4Id = DB::table('products')->insertGetId([
            'category_id' => $catHoaId,
            'name' => 'Trà Hoa Hồng Sấy Khô',
            'slug' => 'tra-hoa-hong-say-kho',
            'description' => 'Nụ hoa hồng Đà Lạt sấy khô nguyên bông. Giàu vitamin C, đẹp da, thơm tự nhiên. Pha trà hoặc kết hợp với các loại trà khác.',
            'thumbnail' => '/img/tra-huong-cam.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var4_50g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod4Id, 'sku' => 'HH-SK-050',
            'weight' => 50, 'price' => 89000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var4_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod4Id, 'sku' => 'HH-SK-100',
            'weight' => 100, 'price' => 165000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP5: Trà Oolong Nhân Sâm ---
        $prod5Id = DB::table('products')->insertGetId([
            'category_id' => $catOolongId,
            'name' => 'Trà Oolong Nhân Sâm',
            'slug' => 'tra-oolong-nhan-sam',
            'description' => 'Oolong kết hợp nhân sâm tự nhiên. Tăng cường sức khỏe, giảm stress. Vị trà đậm đà, hương sâm thanh mát.',
            'thumbnail' => '/img/tra-oolong.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var5_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod5Id, 'sku' => 'OL-NS-100',
            'weight' => 100, 'price' => 195000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var5_250g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod5Id, 'sku' => 'OL-NS-250',
            'weight' => 250, 'price' => 450000, 'sale_price' => 399000,
            'sale_start_date' => $now->copy(), 'sale_end_date' => $now->copy()->addDays(15),
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP6: Trà Atiso Đà Lạt ---
        $prod6Id = DB::table('products')->insertGetId([
            'category_id' => $catThaoMocId,
            'name' => 'Trà Atiso Đà Lạt',
            'slug' => 'tra-atiso-da-lat',
            'description' => 'Trà Atiso nguyên chất từ Đà Lạt. Thanh lọc gan, hỗ trợ tiêu hóa, mát gan giải độc. Thích hợp dùng hàng ngày.',
            'thumbnail' => '/img/tra-thao-moc.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var6_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod6Id, 'sku' => 'AT-DL-100',
            'weight' => 100, 'price' => 75000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var6_250g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod6Id, 'sku' => 'AT-DL-250',
            'weight' => 250, 'price' => 170000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP7: Trà Lài (Jasmine) ---
        $prod7Id = DB::table('products')->insertGetId([
            'category_id' => $catHoaId,
            'name' => 'Trà Lài (Jasmine Tea)',
            'slug' => 'tra-lai-jasmine-tea',
            'description' => 'Trà xanh ướp hoa lài tự nhiên. Hương thơm quyến rũ, vị trà dịu nhẹ. Phù hợp pha trà nóng hoặc trà đá.',
            'thumbnail' => '/img/tra-hoa-cuc.jpg',
            'is_active' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var7_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod7Id, 'sku' => 'TL-JM-100',
            'weight' => 100, 'price' => 85000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // --- SP8: Trà Gừng Mật Ong (inactive — hết mùa) ---
        $prod8Id = DB::table('products')->insertGetId([
            'category_id' => $catThaoMocId,
            'name' => 'Trà Gừng Mật Ong',
            'slug' => 'tra-gung-mat-ong',
            'description' => 'Gừng tươi sấy khô kết hợp mật ong rừng. Làm ấm cơ thể, tăng đề kháng trong mùa đông.',
            'thumbnail' => '/img/tra-gung.jpg',
            'is_active' => false, // Hết mùa — tạm ẩn
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $var8_100g = DB::table('product_variants')->insertGetId([
            'product_id' => $prod8Id, 'sku' => 'TG-MO-100',
            'weight' => 100, 'price' => 70000, 'sale_price' => null,
            'image_url' => null,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // ========================================================
        // 5. TẠO NHÀ CUNG CẤP
        // ========================================================
        $supplier1Id = DB::table('suppliers')->insertGetId([
            'name' => 'Nông Trại Trà Cầu Đất',
            'phone' => '0901234567',
            'email' => 'contact@caudatfarm.vn',
            'address' => 'Thôn Cầu Đất, Xã Xuân Trường, Đà Lạt, Lâm Đồng',
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $supplier2Id = DB::table('suppliers')->insertGetId([
            'name' => 'HTX Trà Tân Cương Thái Nguyên',
            'phone' => '0976543210',
            'email' => 'htx.tancuong@gmail.com',
            'address' => 'Xã Tân Cương, TP. Thái Nguyên, Thái Nguyên',
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // ========================================================
        // 6. TẠO PHIẾU NHẬP KHO & LÔ HÀNG (BATCHES)
        // ========================================================

        // Phiếu nhập 1: Nhập trà Oolong + Hoa từ NCC Cầu Đất
        $receipt1Id = DB::table('import_receipts')->insertGetId([
            'supplier_id' => $supplier1Id,
            'user_id' => $admin->id,
            'total_amount' => 25200000,
            'status' => 'completed',
            'created_at' => $now->copy()->subDays(30),
            'updated_at' => $now->copy()->subDays(30),
        ]);

        DB::table('batches')->insert([
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var1_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-01',
                'manufacture_date' => $now->copy()->subDays(40)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(11)->toDateString(),
                'import_price' => 60000, 'quantity' => 100, 'stock' => 85,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var1_250g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-02',
                'manufacture_date' => $now->copy()->subDays(40)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(11)->toDateString(),
                'import_price' => 140000, 'quantity' => 50, 'stock' => 42,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var1_500g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-03',
                'manufacture_date' => $now->copy()->subDays(40)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(11)->toDateString(),
                'import_price' => 280000, 'quantity' => 20, 'stock' => 16,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var2_50g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-04',
                'manufacture_date' => $now->copy()->subDays(35)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(5)->toDateString(),
                'import_price' => 30000, 'quantity' => 80, 'stock' => 68,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var2_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-05',
                'manufacture_date' => $now->copy()->subDays(35)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(5)->toDateString(),
                'import_price' => 55000, 'quantity' => 60, 'stock' => 50,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var4_50g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-06',
                'manufacture_date' => $now->copy()->subDays(35)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(8)->toDateString(),
                'import_price' => 45000, 'quantity' => 40, 'stock' => 35,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var4_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-07',
                'manufacture_date' => $now->copy()->subDays(35)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(8)->toDateString(),
                'import_price' => 85000, 'quantity' => 30, 'stock' => 27,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var5_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-08',
                'manufacture_date' => $now->copy()->subDays(40)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(10)->toDateString(),
                'import_price' => 100000, 'quantity' => 40, 'stock' => 33,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var5_250g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-09',
                'manufacture_date' => $now->copy()->subDays(40)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(10)->toDateString(),
                'import_price' => 230000, 'quantity' => 20, 'stock' => 17,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var6_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-10',
                'manufacture_date' => $now->copy()->subDays(30)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(6)->toDateString(),
                'import_price' => 35000, 'quantity' => 60, 'stock' => 52,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt1Id, 'variant_id' => $var6_250g,
                'batch_code' => 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-11',
                'manufacture_date' => $now->copy()->subDays(30)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(6)->toDateString(),
                'import_price' => 80000, 'quantity' => 30, 'stock' => 28,
                'created_at' => $now->copy()->subDays(30), 'updated_at' => $now,
            ],
        ]);

        // Phiếu nhập 2: Nhập trà Xanh + Lài từ NCC Thái Nguyên
        $receipt2Id = DB::table('import_receipts')->insertGetId([
            'supplier_id' => $supplier2Id,
            'user_id' => $staff->id,
            'total_amount' => 12600000,
            'status' => 'completed',
            'created_at' => $now->copy()->subDays(15),
            'updated_at' => $now->copy()->subDays(15),
        ]);

        DB::table('batches')->insert([
            [
                'import_receipt_id' => $receipt2Id, 'variant_id' => $var3_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(15)->format('Ymd') . '-01',
                'manufacture_date' => $now->copy()->subDays(20)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(10)->toDateString(),
                'import_price' => 48000, 'quantity' => 120, 'stock' => 108,
                'created_at' => $now->copy()->subDays(15), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt2Id, 'variant_id' => $var3_500g,
                'batch_code' => 'B-' . $now->copy()->subDays(15)->format('Ymd') . '-02',
                'manufacture_date' => $now->copy()->subDays(20)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(10)->toDateString(),
                'import_price' => 210000, 'quantity' => 25, 'stock' => 22,
                'created_at' => $now->copy()->subDays(15), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt2Id, 'variant_id' => $var7_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(15)->format('Ymd') . '-03',
                'manufacture_date' => $now->copy()->subDays(18)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(8)->toDateString(),
                'import_price' => 42000, 'quantity' => 80, 'stock' => 73,
                'created_at' => $now->copy()->subDays(15), 'updated_at' => $now,
            ],
            [
                'import_receipt_id' => $receipt2Id, 'variant_id' => $var8_100g,
                'batch_code' => 'B-' . $now->copy()->subDays(15)->format('Ymd') . '-04',
                'manufacture_date' => $now->copy()->subDays(20)->toDateString(),
                'expiry_date' => $now->copy()->addMonths(4)->toDateString(),
                'import_price' => 35000, 'quantity' => 50, 'stock' => 50,
                'created_at' => $now->copy()->subDays(15), 'updated_at' => $now,
            ],
        ]);

        // Lấy batch IDs để dùng cho order_items
        $batch1 = DB::table('batches')->where('batch_code', 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-01')->value('id');
        $batch2 = DB::table('batches')->where('batch_code', 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-02')->value('id');
        $batch4 = DB::table('batches')->where('batch_code', 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-04')->value('id');
        $batch8 = DB::table('batches')->where('batch_code', 'B-' . $now->copy()->subDays(30)->format('Ymd') . '-08')->value('id');
        $batchTX1 = DB::table('batches')->where('batch_code', 'B-' . $now->copy()->subDays(15)->format('Ymd') . '-01')->value('id');
        $batchTL1 = DB::table('batches')->where('batch_code', 'B-' . $now->copy()->subDays(15)->format('Ymd') . '-03')->value('id');

        // ========================================================
        // 7. TẠO ĐƠN HÀNG (ORDERS + ORDER_ITEMS)
        // ========================================================

        // Đơn 1: Đã hoàn thành (customer1)
        $order1Id = DB::table('orders')->insertGetId([
            'user_id' => $customer1->id,
            'order_code' => 'CK-' . $now->copy()->subDays(20)->format('Ymd') . '-001',
            'total_amount' => 490000 + 120000,        // 1x OL-500g(sale) + 1x OL-100g
            'discount_amount' => 0,
            'shipping_fee' => 30000,
            'final_amount' => 640000,
            'payment_method' => 'cod',
            'payment_status' => 'paid',
            'order_status' => 'completed',
            'shipping_name' => 'Trần Thị Lan',
            'shipping_phone' => '0912345678',
            'shipping_address' => '78 Trần Hưng Đạo, Quận 5, TP.HCM',
            'shipping_provider' => 'GHN',
            'tracking_number' => 'GHN' . rand(100000, 999999),
            'shipped_at' => $now->copy()->subDays(18),
            'delivered_at' => $now->copy()->subDays(16),
            'created_at' => $now->copy()->subDays(20),
            'updated_at' => $now->copy()->subDays(16),
        ]);

        DB::table('order_items')->insert([
            [
                'order_id' => $order1Id, 'variant_id' => $var1_500g,
                'batch_id' => null, 'quantity' => 1, 'price' => 490000,
                'created_at' => $now->copy()->subDays(20), 'updated_at' => $now->copy()->subDays(20),
            ],
            [
                'order_id' => $order1Id, 'variant_id' => $var1_100g,
                'batch_id' => $batch1, 'quantity' => 1, 'price' => 120000,
                'created_at' => $now->copy()->subDays(20), 'updated_at' => $now->copy()->subDays(20),
            ],
        ]);

        // Đơn 2: Đang giao hàng (customer2)
        $order2Id = DB::table('orders')->insertGetId([
            'user_id' => $customer2->id,
            'order_code' => 'CK-' . $now->copy()->subDays(3)->format('Ymd') . '-002',
            'total_amount' => 250000 + 99000 + 195000,   // OL-250g(sale) + HC-100g(sale) + OLNS-100g
            'discount_amount' => 0,
            'shipping_fee' => 25000,
            'final_amount' => 569000,
            'payment_method' => 'vnpay',
            'payment_status' => 'paid',
            'order_status' => 'shipping',
            'shipping_name' => 'Lê Hoàng Nam',
            'shipping_phone' => '0923456789',
            'shipping_address' => '12 Phạm Văn Đồng, Thủ Đức, TP.HCM',
            'shipping_provider' => 'GHTK',
            'tracking_number' => 'GHTK' . rand(100000, 999999),
            'shipped_at' => $now->copy()->subDays(1),
            'delivered_at' => null,
            'created_at' => $now->copy()->subDays(3),
            'updated_at' => $now->copy()->subDays(1),
        ]);

        DB::table('order_items')->insert([
            [
                'order_id' => $order2Id, 'variant_id' => $var1_250g,
                'batch_id' => $batch2, 'quantity' => 1, 'price' => 250000,
                'created_at' => $now->copy()->subDays(3), 'updated_at' => $now->copy()->subDays(3),
            ],
            [
                'order_id' => $order2Id, 'variant_id' => $var2_100g,
                'batch_id' => null, 'quantity' => 1, 'price' => 99000,
                'created_at' => $now->copy()->subDays(3), 'updated_at' => $now->copy()->subDays(3),
            ],
            [
                'order_id' => $order2Id, 'variant_id' => $var5_100g,
                'batch_id' => $batch8, 'quantity' => 1, 'price' => 195000,
                'created_at' => $now->copy()->subDays(3), 'updated_at' => $now->copy()->subDays(3),
            ],
        ]);

        // Đơn 3: Chờ xử lý (customer3)
        $order3Id = DB::table('orders')->insertGetId([
            'user_id' => $customer3->id,
            'order_code' => 'CK-' . $now->format('Ymd') . '-003',
            'total_amount' => 95000 + 85000 + 65000,     // TX-100g + TL-100g + HC-50g
            'discount_amount' => 10000,
            'shipping_fee' => 20000,
            'final_amount' => 255000,
            'payment_method' => 'momo',
            'payment_status' => 'paid',
            'order_status' => 'pending',
            'shipping_name' => 'Phạm Minh Anh',
            'shipping_phone' => '0934567890',
            'shipping_address' => '56 Hoàng Diệu, Quận 4, TP.HCM',
            'shipping_provider' => null,
            'tracking_number' => null,
            'shipped_at' => null,
            'delivered_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('order_items')->insert([
            [
                'order_id' => $order3Id, 'variant_id' => $var3_100g,
                'batch_id' => $batchTX1, 'quantity' => 1, 'price' => 95000,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'order_id' => $order3Id, 'variant_id' => $var7_100g,
                'batch_id' => $batchTL1, 'quantity' => 1, 'price' => 85000,
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'order_id' => $order3Id, 'variant_id' => $var2_50g,
                'batch_id' => $batch4, 'quantity' => 1, 'price' => 65000,
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);

        // ========================================================
        // 8. TẠO WISHLISTS
        // ========================================================
        DB::table('wishlists')->insert([
            ['user_id' => $customer1->id, 'product_id' => $prod2Id, 'created_at' => $now->copy()->subDays(10)],
            ['user_id' => $customer1->id, 'product_id' => $prod4Id, 'created_at' => $now->copy()->subDays(8)],
            ['user_id' => $customer1->id, 'product_id' => $prod5Id, 'created_at' => $now->copy()->subDays(5)],
            ['user_id' => $customer2->id, 'product_id' => $prod1Id, 'created_at' => $now->copy()->subDays(7)],
            ['user_id' => $customer2->id, 'product_id' => $prod3Id, 'created_at' => $now->copy()->subDays(4)],
            ['user_id' => $customer2->id, 'product_id' => $prod6Id, 'created_at' => $now->copy()->subDays(2)],
            ['user_id' => $customer3->id, 'product_id' => $prod1Id, 'created_at' => $now->copy()->subDays(6)],
            ['user_id' => $customer3->id, 'product_id' => $prod7Id, 'created_at' => $now->copy()->subDays(1)],
        ]);
    }
}