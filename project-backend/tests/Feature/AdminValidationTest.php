<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Batch;
use Spatie\Permission\Models\Role;

class AdminValidationTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Tạo Role và Permissions
        $role = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $permissions = ['manage-products', 'manage-categories', 'manage-orders', 'manage-import', 'view-dashboard'];
        foreach ($permissions as $perm) {
            $p = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
            $role->givePermissionTo($p);
        }
        
        // Tạo User Admin
        $this->admin = User::factory()->create([
            'email' => 'admin_test@gmail.com',
            'is_active' => true
        ]);
        $this->admin->assignRole('super-admin');
    }

    /**
     * @test
     * Kiểm tra Validation Biến thể Sản phẩm (Giá, Trọng lượng, SKU)
     */
    public function test_product_variants_must_be_valid()
    {
        $category = Category::create([
            'name' => 'Trà Test',
            'slug' => 'tra-test',
            'is_active' => true
        ]);

        $invalidVariants = [
            [
                'sku' => '', // Thiếu SKU
                'weight' => -50, // Trọng lượng âm (Lỗi)
                'price' => -10000, // Giá âm (Lỗi)
            ],
            [
                'sku' => 'SKU-DUPLICATE', // SKU trùng nhau trong cùng request
                'weight' => 100,
                'price' => 50000,
            ],
            [
                'sku' => 'SKU-DUPLICATE', // SKU trùng nhau
                'weight' => 200,
                'price' => 90000,
            ]
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/products', [
            'name' => 'Sản phẩm Test',
            'slug' => 'san-pham-test',
            'category_id' => $category->id,
            'description' => 'Test',
            'variants' => json_encode($invalidVariants) // Controller nhận chuỗi JSON
        ]);

        // Phải bị chặn lại (HTTP 422)
        $response->assertStatus(422);

        // Kiểm tra xem có đúng thông báo lỗi trả về cho các trường bên trong mảng không
        $response->assertJsonValidationErrors([
            'variants.0.sku',
            'variants.0.weight',
            'variants.0.price',
            'variants.1.sku',
            'variants.2.sku',
        ]);
    }

    /**
     * @test
     * Kiểm tra Validation Nhập kho (HSD cận date và Bán lỗ)
     */
    public function test_inventory_import_blocks_near_date_and_loss_price()
    {
        $category = Category::create(['name' => 'Cat 1', 'slug' => 'cat-1', 'is_active' => true]);
        $product = Product::create([
            'name' => 'Trà Xanh', 'slug' => 'tra-xanh', 'category_id' => $category->id, 'is_active' => true
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'TX-100',
            'weight' => 100,
            'price' => 50000 // Giá bán lẻ 50k
        ]);

        $supplier = Supplier::create([
            'name' => 'Nhà cung cấp Test',
            'phone' => '0123456789',
            'address' => 'Hà Nội'
        ]);


        // Kịch bản 1: Nhập hàng cận Date (HSD còn dưới 30 ngày)
        $responseNearDate = $this->actingAs($this->admin)->postJson('/api/admin/inventory/import', [
            'supplier_id' => $supplier->id,
            'items' => [
                [
                    'variant_id' => $variant->id,
                    'quantity' => 10,
                    'import_price' => 30000, // Giá nhập hợp lý
                    'mfg_date' => now()->subDays(10)->toDateString(),
                    'exp_date' => now()->addDays(20)->toDateString(), // Lỗi: Còn 20 ngày là hết hạn
                ]
            ]
        ]);

        $responseNearDate->assertStatus(422);
        $responseNearDate->assertJsonFragment(['message' => 'Lô hàng không hợp lệ (Cận date)']);

        // Kịch bản 2: Giá nhập cao hơn giá bán (Nhập 60k, bán 50k)
        $responseLossPrice = $this->actingAs($this->admin)->postJson('/api/admin/inventory/import', [
            'supplier_id' => $supplier->id,
            'items' => [
                [
                    'variant_id' => $variant->id,
                    'quantity' => 10,
                    'import_price' => 60000, // Lỗi: Cao hơn giá bán (50k)
                    'mfg_date' => now()->subDays(10)->toDateString(),
                    'exp_date' => now()->addMonths(6)->toDateString(), // HSD hợp lệ
                ]
            ]
        ]);

        $responseLossPrice->assertStatus(422);
        $responseLossPrice->assertJsonFragment(['message' => 'Lô hàng không hợp lệ (Lỗ vốn)']);
    }

    /**
     * @test
     * Kiểm tra phục hồi Tồn kho khi đơn hàng bị Hủy (cancelled) hoặc Bom hàng (returned)
     */
    public function test_order_status_returns_stock_when_cancelled_or_returned()
    {
        $category = Category::create(['name' => 'Cat 1', 'slug' => 'cat-1', 'is_active' => true]);
        $product = Product::create([
            'name' => 'Trà Xanh', 'slug' => 'tra-xanh', 'category_id' => $category->id, 'is_active' => true
        ]);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'TEST-01',
            'weight' => 100,
            'price' => 50000,
        ]);
        $supplier = Supplier::create(['name' => 'Sup 1', 'phone' => '123', 'address' => 'HN']);
        $receipt = \App\Models\ImportReceipt::create(['supplier_id' => $supplier->id, 'user_id' => $this->admin->id, 'total_amount' => 1000]);

        $batch = Batch::create([
            'import_receipt_id' => $receipt->id,
            'variant_id' => $variant->id,
            'batch_code' => 'B-TEST',
            'stock' => 10, // Tồn kho ban đầu
            'manufacture_date' => now()->subMonth(),
            'expiry_date' => now()->addYear(),
            'import_price' => 30000,
            'quantity' => 10
        ]);

        $order = Order::create([
            'user_id' => $this->admin->id,
            'order_code' => 'ORD-123',
            'total_amount' => 50000,
            'final_amount' => 50000,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'shipping',
            'shipping_name' => 'Nguyễn Văn A',
            'shipping_phone' => '0901234567',
            'shipping_address' => 'Hà Nội'
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'variant_id' => $variant->id,
            'batch_id' => $batch->id,
            'quantity' => 2, // Đã trừ đi 2 khi đặt hàng (Thực tế khi đặt hàm store đã trừ stock trong DB, ở đây ta test giả lập updateStatus trả lại)
            'price' => 50000
        ]);

        // Cập nhật trạng thái thành 'returned'
        $response = $this->actingAs($this->admin)->putJson("/api/admin/orders/{$order->id}/status", [
            'status' => 'returned'
        ]);

        $response->assertStatus(200);

        // Kiểm tra xem Lô hàng có được cộng lại 2 sản phẩm không
        $batch->refresh();
        $this->assertEquals(12, $batch->stock); // 10 + 2 = 12
    }

    /**
     * @test
     * Kiểm tra Giới hạn Khuyến mãi % (Không quá 100%)
     */
    public function test_promotion_percent_discount_cannot_exceed_100()
    {
        // Cố tình tạo khuyến mãi 150%
        $response = $this->actingAs($this->admin)->postJson('/api/admin/promotions', [
            'name' => 'Giảm giá cực sốc',
            'discount_type' => 'percent',
            'discount_value' => 150, // Lỗi: > 100
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'apply_to' => 'all',
            'is_active' => true
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['discount_value']);
        
        // Tạo khuyến mãi với start_date ở quá khứ
        $responsePast = $this->actingAs($this->admin)->postJson('/api/admin/promotions', [
            'name' => 'Giảm giá hôm qua',
            'discount_type' => 'fixed',
            'discount_value' => 50000,
            'start_date' => now()->subDays(2)->toDateString(), // Lỗi: Quá khứ
            'end_date' => now()->addDays(5)->toDateString(),
            'apply_to' => 'all',
            'is_active' => true
        ]);

        $responsePast->assertStatus(422);
        $responsePast->assertJsonValidationErrors(['start_date']);
    }
}
