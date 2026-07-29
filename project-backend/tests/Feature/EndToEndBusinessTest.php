<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class EndToEndBusinessTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Cấp quyền Admin và Customer
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::firstOrCreate(['name' => 'manage-categories']));
        $adminRole->givePermissionTo(Permission::firstOrCreate(['name' => 'manage-products']));
        $adminRole->givePermissionTo(Permission::firstOrCreate(['name' => 'manage-import']));
        $adminRole->givePermissionTo(Permission::firstOrCreate(['name' => 'manage-orders']));
        
        $customerRole = Role::firstOrCreate(['name' => 'customer']);
    }

    public function test_full_business_flow()
    {
        // 1. Tạo Users
        $admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin_test@example.com',
            'password' => bcrypt('password123')
        ]);
        $admin->assignRole('admin');

        $customer = User::create([
            'name' => 'Customer Test',
            'email' => 'customer_test@example.com',
            'password' => bcrypt('password123')
        ]);
        $customer->assignRole('customer');

        // --- BẮT ĐẦU LUỒNG ADMIN ---
        $this->actingAs($admin, 'sanctum');

        // 2. Admin tạo Category
        $categoryPayload = [
            'name' => 'Trà xanh cao cấp',
            'slug' => 'tra-xanh-cao-cap',
            'description' => 'Mô tả trà xanh',
            'is_active' => true
        ];
        $response = $this->postJson('/api/admin/categories', $categoryPayload);
        $response->assertStatus(201);
        $categoryId = $response->json('category.id') ?? $response->json('data.id') ?? 1; // Tuỳ chuẩn trả về của API

        // 3. Admin tạo Sản phẩm kèm Biến thể
        $productPayload = [
            'name' => 'Trà ô long test',
            'slug' => 'tra-o-long-test',
            'category_id' => $categoryId,
            'description' => 'Trà ngon',
            'is_active' => true,
            'variants' => json_encode([
                [
                    'sku' => 'TEST-OLONG-100G',
                    'weight' => 100,
                    'price' => 150000,
                    'is_default' => true,
                    'is_active' => true
                ],
                [
                    'sku' => 'TEST-OLONG-500G',
                    'weight' => 500,
                    'price' => 700000,
                    'is_default' => false,
                    'is_active' => true
                ]
            ])
        ];
        $response = $this->postJson('/api/admin/products', $productPayload);
        if ($response->status() !== 201) {
            $response->dump();
        }
        $response->assertStatus(201);
        $productId = $response->json('product.id') ?? $response->json('data.id');
        $variant1Id = $response->json('product.variants.0.id') ?? $response->json('data.variants.0.id') ?? 1;

        // 4. Admin tạo Nhà cung cấp
        $supplierPayload = [
            'name' => 'Nhà cung cấp Trà Mùa Xuân',
            'phone' => '0987654321',
            'email' => 'muaxuan@test.com',
            'address' => '123 Đường Xuân'
        ];
        $response = $this->postJson('/api/admin/suppliers', $supplierPayload);
        $response->assertStatus(201);
        $supplierId = $response->json('data.id') ?? $response->json('supplier.id') ?? 1;

        // 5. Admin tạo Phiếu nhập kho (Nhập 100 sản phẩm)
        $importPayload = [
            'supplier_id' => $supplierId,
            'items' => [
                [
                    'variant_id' => $variant1Id,
                    'quantity' => 100,
                    'import_price' => 100000,
                    'mfg_date' => '2026-01-01',
                    'exp_date' => '2028-12-31'
                ]
            ],
            'note' => 'Nhập hàng test'
        ];
        $response = $this->postJson('/api/admin/inventory/import', $importPayload);
        if ($response->status() !== 201) {
            $response->dump();
        }
        $response->assertStatus(201);

        // Kiểm tra tồn kho đã tăng lên 100 trong CSDL chưa
        $this->assertDatabaseHas('batches', [
            'variant_id' => $variant1Id,
            'stock' => 100
        ]);

        // --- BẮT ĐẦU LUỒNG KHÁCH HÀNG ---
        $this->actingAs($customer, 'sanctum');

        // 6. Khách hàng xem sản phẩm
        $response = $this->getJson('/api/products');
        $response->assertStatus(200);

        // 7. Khách hàng đặt hàng
        $orderPayload = [
            'shipping_name' => 'Khách hàng A',
            'shipping_phone' => '0123456789',
            'shipping_address' => '456 Đường Hè',
            'payment_method' => 'cod',
            'total_amount' => 450000,
            'items' => [
                [
                    'variant_id' => $variant1Id,
                    'quantity' => 3,
                    'price' => 150000
                ]
            ]
        ];
        $response = $this->postJson('/api/orders', $orderPayload);
        if ($response->status() !== 201) {
            $response->dump();
        }
        $response->assertStatus(201);
        $orderId = $response->json('order.id');

        // 8. Kiểm tra tồn kho bị trừ (100 - 3 = 97)
        $this->assertDatabaseHas('batches', [
            'variant_id' => $variant1Id,
            'stock' => 97
        ]);

        // --- ADMIN QUẢN LÝ ĐƠN HÀNG ---
        $this->actingAs($admin, 'sanctum');

        // 9. Cập nhật trạng thái đơn hàng sang "processing"
        $response = $this->putJson("/api/admin/orders/{$orderId}/status", [
            'status' => 'processing'
        ]);
        if ($response->status() !== 200) {
            $response->dump();
        }
        $response->assertStatus(200);

        // Kiểm tra trong CSDL đơn hàng đã đổi trạng thái
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'order_status' => 'processing'
        ]);
    }

    public function test_online_payment_and_cancellation_flow()
    {
        // Setup Users
        $admin = User::create([
            'name' => 'Admin Test 2',
            'email' => 'admin_test2@example.com',
            'password' => bcrypt('password123')
        ]);
        $admin->assignRole('admin');

        $customer = User::create([
            'name' => 'Customer Test 2',
            'email' => 'customer_test2@example.com',
            'password' => bcrypt('password123')
        ]);
        $customer->assignRole('customer');

        // Setup Products and Inventory (Admin)
        $this->actingAs($admin, 'sanctum');

        $categoryPayload = ['name' => 'Trà xanh 2', 'slug' => 'tra-xanh-2', 'description' => 'Desc', 'is_active' => true];
        $response = $this->postJson('/api/admin/categories', $categoryPayload);
        $categoryId = $response->json('category.id') ?? $response->json('data.id') ?? 1;

        $productPayload = [
            'name' => 'Trà ô long 2',
            'slug' => 'tra-o-long-2',
            'category_id' => $categoryId,
            'description' => 'Trà ngon',
            'is_active' => true,
            'variants' => json_encode([
                [
                    'sku' => 'TEST-OLONG-100G-2',
                    'weight' => 100,
                    'price' => 150000,
                    'is_default' => true,
                    'is_active' => true
                ]
            ])
        ];
        $response = $this->postJson('/api/admin/products', $productPayload);
        $variant1Id = $response->json('product.variants.0.id') ?? $response->json('data.variants.0.id') ?? 1;

        $supplierPayload = ['name' => 'NCC 2', 'phone' => '0987654321', 'email' => 'ncc2@test.com', 'address' => '123'];
        $response = $this->postJson('/api/admin/suppliers', $supplierPayload);
        $supplierId = $response->json('data.id') ?? $response->json('supplier.id') ?? 1;

        $importPayload = [
            'supplier_id' => $supplierId,
            'items' => [
                ['variant_id' => $variant1Id, 'quantity' => 100, 'import_price' => 100000, 'mfg_date' => '2026-01-01', 'exp_date' => '2028-12-31']
            ],
            'note' => 'Nhập hàng test 2'
        ];
        $this->postJson('/api/admin/inventory/import', $importPayload);

        // --- BẮT ĐẦU LUỒNG THANH TOÁN VNPay VÀ HỦY ĐƠN (CUSTOMER) ---
        $this->actingAs($customer, 'sanctum');

        // 1. Khách hàng đặt hàng với VNPay
        $orderPayload = [
            'shipping_name' => 'Khách hàng 2',
            'shipping_phone' => '0123456789',
            'shipping_address' => '456 Đường Hè',
            'payment_method' => 'vnpay',
            'total_amount' => 300000,
            'items' => [
                ['variant_id' => $variant1Id, 'quantity' => 2, 'price' => 150000]
            ]
        ];
        $response = $this->postJson('/api/orders', $orderPayload);
        $response->assertStatus(201);
        $orderId = $response->json('order.id');
        $orderCode = $response->json('order.order_code');

        // Kiểm tra tồn kho đã bị trừ (100 - 2 = 98)
        $this->assertDatabaseHas('batches', [
            'variant_id' => $variant1Id,
            'stock' => 98
        ]);
        
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'payment_status' => 'pending',
            'order_status' => 'pending'
        ]);

        // 2. Mock VNPayService để xác nhận thanh toán
        $this->mock(\App\Services\VNPayService::class, function (\Mockery\MockInterface $mock) use ($orderCode) {
            $mock->shouldReceive('verifyPayment')->once()->andReturn([
                'success' => true,
                'message' => 'Giao dịch thành công',
                'orderCode' => $orderCode
            ]);
            $mock->shouldReceive('refund')->once()->andReturn([
                'success' => true,
                'message' => 'Hoàn tiền giả lập thành công'
            ]);
        });

        // Gọi API Verify VNPay (IPN)
        $response = $this->postJson('/api/payment/vnpay/verify', [
            'vnp_SecureHash' => 'dummy_hash', // Dữ liệu sẽ được mock xử lý
            'vnp_TxnRef' => $orderCode,
            'vnp_ResponseCode' => '00'
        ]);
        $response->assertStatus(200);

        // Kiểm tra đơn hàng đã được cập nhật thành 'paid'
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'payment_status' => 'paid',
            'order_status' => 'pending' // Vẫn đang pending xử lý
        ]);

        // 3. Khách hàng đổi ý và HỦY ĐƠN (Vì order_status vẫn là pending nên được phép hủy)
        $response = $this->putJson("/api/user/orders/{$orderId}/cancel");
        if ($response->status() !== 200) {
            $response->dump();
        }
        $response->assertStatus(200);

        // Kiểm tra đơn hàng đã đổi sang cancelled và payment_status là refunded
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'order_status' => 'cancelled',
            'payment_status' => 'refunded' // Đã hoàn tiền
        ]);

        // Kiểm tra tồn kho đã được hoàn lại (+2) -> 100
        $this->assertDatabaseHas('batches', [
            'variant_id' => $variant1Id,
            'stock' => 100
        ]);
    }
}
