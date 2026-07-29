<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'sku', 'weight', 'price', 'image_url'
    ];

    protected $appends = ['total_stock'];

    public function getTotalStockAttribute()
    {
        // Tính tổng stock từ các lô hàng (batches) chưa hết hạn và stock > 0
        return $this->batches()
            ->where('expiry_date', '>', now())
            ->sum('stock');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function batches()
    {
        return $this->hasMany(Batch::class, 'variant_id');
    }
}