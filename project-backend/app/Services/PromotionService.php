<?php

namespace App\Services;

use App\Models\Promotion;
use App\Models\ProductVariant;

class PromotionService
{
    protected $activePromotions;

    public function __construct()
    {
        $this->activePromotions = Promotion::with(['categories', 'products', 'variants'])
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get();
    }

    public function getBestPromotionForVariant($variant, $categoryId, $productId)
    {
        if ($this->activePromotions->isEmpty()) {
            return ['sale_price' => null, 'promotion_id' => null];
        }

        $bestPrice = null;
        $bestPromotionId = null;

        foreach ($this->activePromotions as $promo) {
            $isApplicable = false;
            
            if ($promo->apply_to === 'all') {
                $isApplicable = true;
            } elseif ($promo->apply_to === 'category') {
                if ($promo->categories->contains('id', $categoryId)) {
                    $isApplicable = true;
                }
            } elseif ($promo->apply_to === 'product') {
                if ($promo->products->contains('id', $productId)) {
                    $isApplicable = true;
                }
            } elseif ($promo->apply_to === 'variant') {
                if ($promo->variants->contains('id', $variant->id)) {
                    $isApplicable = true;
                }
            }

            if ($isApplicable && $promo->discount_type === 'fixed' && $promo->discount_value >= $variant->price) {
                $isApplicable = false;
            }

            if ($isApplicable) {
                $price = $promo->discount_type === 'percent' 
                    ? $variant->price * (1 - $promo->discount_value / 100)
                    : $variant->price - $promo->discount_value;
                    
                if ($price < 0) $price = 0;

                if ($bestPrice === null || $price < $bestPrice) {
                    $bestPrice = $price;
                    $bestPromotionId = $promo->id;
                }
            }
        }

        if ($bestPrice !== null && $bestPrice < $variant->price) {
            return [
                'sale_price' => $bestPrice,
                'promotion_id' => $bestPromotionId
            ];
        }

        return ['sale_price' => null, 'promotion_id' => null];
    }
}
