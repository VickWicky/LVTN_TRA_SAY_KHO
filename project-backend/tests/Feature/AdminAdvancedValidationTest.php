<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AdminAdvancedValidationTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $permissions = ['manage-users', 'manage-categories', 'manage-suppliers', 'manage-banners'];
        foreach ($permissions as $perm) {
            $p = Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
            $role->givePermissionTo($p);
        }
        
        $this->admin = User::factory()->create([
            'email' => 'admin_test_adv@gmail.com',
            'is_active' => true
        ]);
        $this->admin->assignRole('admin');
    }

    /**
     * @test
     */
    public function test_phone_number_must_be_valid_vietnamese_format()
    {
        // Tạo user mới với số điện thoại sai định dạng
        $response = $this->actingAs($this->admin)->postJson('/api/admin/accounts', [
            'name' => 'Test User',
            'email' => 'testuser@gmail.com',
            'password' => 'password',
            'role' => 'admin',
            'phone' => '12345' // Lỗi
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['phone']);

        // Tạo supplier với số điện thoại đúng định dạng
        $responseSupplier = $this->actingAs($this->admin)->postJson('/api/admin/suppliers', [
            'name' => 'Supplier Test Phone',
            'phone' => '0912345678' // Hợp lệ
        ]);

        $responseSupplier->assertStatus(201);
    }

    /**
     * @test
     */
    public function test_cannot_downgrade_or_deactivate_last_admin()
    {
        // 1. Hạ quyền
        $roleStaff = Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        
        $responseDowngrade = $this->actingAs($this->admin)->putJson("/api/admin/accounts/{$this->admin->id}", [
            'name' => 'Admin Updated',
            'role' => 'staff' // Cố tình hạ quyền
        ]);

        $responseDowngrade->assertStatus(403);
        $responseDowngrade->assertJsonFragment(['message' => 'Bạn không thể tự thay đổi quyền của chính mình!']);

        // 2. Tự khóa tài khoản
        $responseLock = $this->actingAs($this->admin)->putJson("/api/admin/accounts/{$this->admin->id}/status", [
            'is_active' => false // Cố tình khóa
        ]);

        $responseLock->assertStatus(403);
        $responseLock->assertJsonFragment(['message' => 'Bạn không thể tự khóa tài khoản của chính mình!']);
    }

    /**
     * @test
     */
    public function test_cannot_delete_category_containing_products()
    {
        $category = Category::create([
            'name' => 'Trà Oolong',
            'slug' => 'tra-oolong',
            'is_active' => true
        ]);

        // Tạo sản phẩm thuộc danh mục này
        Product::create([
            'name' => 'Oolong Lộc Phát',
            'slug' => 'oolong-loc-phat',
            'category_id' => $category->id,
            'is_active' => true
        ]);

        // Cố xóa danh mục
        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/categories/{$category->id}");

        $response->assertStatus(400);
        $response->assertJsonFragment(['message' => 'Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục.']);
    }

    /**
     * @test
     */
    public function test_banner_cta_link_must_be_valid_url_or_path()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/banners', [
            'title' => 'Banner lỗi',
            'cta_link' => 'khuyen-mai-sai', // Lỗi: Không bắt đầu bằng / hoặc http
            'image' => 'https://res.cloudinary.com/test.jpg'
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['cta_link']);
        
        $responseValid = $this->actingAs($this->admin)->postJson('/api/admin/banners', [
            'title' => 'Banner đúng',
            'cta_link' => '/khuyen-mai', // Hợp lệ
            'image' => 'https://res.cloudinary.com/test.jpg'
        ]);
        
        // Theo Controller thì trả về 200 (có thể có message 'Tạo banner thành công')
        $responseValid->assertStatus(200);
    }
}
