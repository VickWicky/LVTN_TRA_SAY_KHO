<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Cập nhật kiểu ENUM cho cột apply_to
        DB::statement("ALTER TABLE promotions MODIFY COLUMN apply_to ENUM('all', 'category', 'product', 'variant') DEFAULT 'all'");

        // Xóa cột JSON cũ
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn('reference_ids');
        });

        // Tạo 3 bảng trung gian
        Schema::create('category_promotion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('product_promotion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('promotion_variant', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotion_variant');
        Schema::dropIfExists('product_promotion');
        Schema::dropIfExists('category_promotion');

        Schema::table('promotions', function (Blueprint $table) {
            $table->json('reference_ids')->nullable();
        });
        
        DB::statement("ALTER TABLE promotions MODIFY COLUMN apply_to ENUM('all', 'category', 'product') DEFAULT 'all'");
    }
};
