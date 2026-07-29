<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Promotion;
use Illuminate\Support\Facades\Validator;

class PromotionController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $query = Promotion::with(['categories', 'products', 'variants'])->orderBy('created_at', 'desc');

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(10));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'discount_type' => 'required|in:percent,fixed',
            'discount_value' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'apply_to' => 'required|in:all,category,product,variant',
            'reference_ids' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $promotion = Promotion::create($request->except('reference_ids'));

        $this->syncReferences($promotion, $request->apply_to, $request->reference_ids);

        return response()->json(['message' => 'Tạo khuyến mãi thành công', 'promotion' => $promotion->load('categories', 'products', 'variants')], 201);
    }

    public function update(Request $request, $id)
    {
        $promotion = Promotion::findOrFail($id);

        if (now()->greaterThan($promotion->end_date)) {
            return response()->json(['message' => 'Không thể sửa khuyến mãi đã kết thúc'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'discount_type' => 'sometimes|required|in:percent,fixed',
            'discount_value' => 'sometimes|required|numeric|min:0',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'apply_to' => 'sometimes|required|in:all,category,product,variant',
            'reference_ids' => 'nullable|array',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $promotion->update($request->except('reference_ids'));

        if ($request->has('apply_to') || $request->has('reference_ids')) {
            $applyTo = $request->input('apply_to', $promotion->apply_to);
            $referenceIds = $request->input('reference_ids', []);
            $this->syncReferences($promotion, $applyTo, $referenceIds);
        }

        return response()->json(['message' => 'Cập nhật khuyến mãi thành công', 'promotion' => $promotion->load('categories', 'products', 'variants')]);
    }

    private function syncReferences(Promotion $promotion, $applyTo, $referenceIds)
    {
        // Xóa liên kết cũ để đảm bảo sạch sẽ nếu đổi apply_to
        if ($applyTo !== 'category') $promotion->categories()->detach();
        if ($applyTo !== 'product') $promotion->products()->detach();
        if ($applyTo !== 'variant') $promotion->variants()->detach();

        if (is_array($referenceIds)) {
            if ($applyTo === 'category') {
                $promotion->categories()->sync($referenceIds);
            } elseif ($applyTo === 'product') {
                $promotion->products()->sync($referenceIds);
            } elseif ($applyTo === 'variant') {
                $promotion->variants()->sync($referenceIds);
            }
        }
    }

    public function destroy($id)
    {
        $promotion = Promotion::findOrFail($id);
        $promotion->categories()->detach();
        $promotion->products()->detach();
        $promotion->variants()->detach();
        $promotion->delete();

        return response()->json(['message' => 'Xóa khuyến mãi thành công']);
    }

    public function stats($id)
    {
        $promotion = Promotion::findOrFail($id);
        
        $stats = \Illuminate\Support\Facades\DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('order_items.promotion_id', $promotion->id)
            ->where('orders.order_status', 'completed')
            ->select(
                \Illuminate\Support\Facades\DB::raw('SUM(order_items.quantity) as total_sold'),
                \Illuminate\Support\Facades\DB::raw('SUM(order_items.quantity * order_items.price) as total_revenue')
            )
            ->first();

        $variantsQuery = \App\Models\ProductVariant::with('product')->select('product_variants.*');

        if ($promotion->apply_to === 'category') {
            $categoryIds = $promotion->categories()->pluck('categories.id')->toArray();
            $variantsQuery->whereHas('product', function ($q) use ($categoryIds) {
                $q->whereIn('category_id', $categoryIds);
            });
        } elseif ($promotion->apply_to === 'product') {
            $productIds = $promotion->products()->pluck('products.id')->toArray();
            $variantsQuery->whereIn('product_id', $productIds);
        } elseif ($promotion->apply_to === 'variant') {
            $variantIds = $promotion->variants()->pluck('product_variants.id')->toArray();
            $variantsQuery->whereIn('product_variants.id', $variantIds);
        }

        $variants = $variantsQuery->get();

        $orderStats = \Illuminate\Support\Facades\DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('order_items.promotion_id', $promotion->id)
            ->where('orders.order_status', 'completed')
            ->select(
                'order_items.variant_id',
                \Illuminate\Support\Facades\DB::raw('SUM(order_items.quantity) as sold'),
                \Illuminate\Support\Facades\DB::raw('SUM(order_items.quantity * order_items.price) as revenue')
            )
            ->groupBy('order_items.variant_id')
            ->get()
            ->keyBy('variant_id');

        $itemsBreakdown = [];
        foreach ($variants as $variant) {
            $stat = $orderStats->get($variant->id);
            $itemsBreakdown[] = [
                'product_name' => $variant->product ? $variant->product->name : 'Sản phẩm #' . $variant->product_id,
                'variant_weight' => $variant->weight,
                'sold' => (int) ($stat ? $stat->sold : 0),
                'revenue' => (float) ($stat ? $stat->revenue : 0),
            ];
        }

        usort($itemsBreakdown, function ($a, $b) {
            if ($b['sold'] != $a['sold']) {
                return $b['sold'] <=> $a['sold'];
            }
            if ($b['revenue'] != $a['revenue']) {
                return $b['revenue'] <=> $a['revenue'];
            }
            return strcmp($a['product_name'], $b['product_name']);
        });

        return response()->json([
            'total_sold' => (int) ($stats->total_sold ?? 0),
            'total_revenue' => (float) ($stats->total_revenue ?? 0),
            'items_breakdown' => $itemsBreakdown
        ]);
    }
}
