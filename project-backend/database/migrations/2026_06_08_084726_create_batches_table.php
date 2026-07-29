<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_receipt_id')->constrained('import_receipts');
            $table->foreignId('variant_id')->constrained('product_variants');
            $table->string('batch_code'); // Mã lô hàng
            $table->date('manufacture_date'); // Ngày sản xuất
            $table->date('expiry_date'); // Hạn sử dụng (Rất quan trọng với trà)
            $table->decimal('import_price', 10, 2); // Giá vốn nhập vào
            $table->integer('quantity'); // Số lượng nhập ban đầu
            $table->integer('stock'); // Số lượng tồn kho hiện tại của lô này
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
