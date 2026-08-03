<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Promotion;

class ProductController extends Controller
{
    public function getCategories()
    {
        $categories = Cache::remember('active_categories', 3600, function () {
            return Category::where('is_active', true)->get();
        });
        return response()->json($categories);
    }

    private function applyPromotions($products)
    {
        $promotionService = new \App\Services\PromotionService();
        $now = now();

        foreach ($products as $product) {
            foreach ($product->variants as $variant) {
                // Set variant's sale price to null by default
                $variant->sale_price = null;
                $variant->promotion_id = null; // Thêm dòng này để FE có thể biết nếu cần

                $promoData = $promotionService->getBestPromotionForVariant($variant, $product->category_id, $product->id);
                
                if ($promoData['sale_price'] !== null) {
                    $variant->sale_price = $promoData['sale_price'];
                    $variant->promotion_id = $promoData['promotion_id'];
                }
            }
        }

        return $products;
    }

    public function index()
    {
        $products = Cache::remember('active_products', 600, function () {
            return Product::with(['variants', 'category'])
                ->where('is_active', true)
                ->orderBy('created_at', 'desc')
                ->get();
        });
           
        return response()->json($this->applyPromotions($products));
    }

    public function adminIndex(Request $request)
    {
        $search = $request->input('search');

        $query = Product::with([
            'category', 
            'variants' => function ($query) {
                $query->withSum('batches', 'stock');
            }
        ])
        ->orderBy('created_at', 'desc');

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhereHas('variants', function($q) use ($search) {
                      $q->where('sku', 'like', "%{$search}%");
                  });
        }
           
        return response()->json($query->paginate(10));
    }

    public function topRandom()
    {
        $products = Product::with('variants')
            ->where('is_active', true)
            ->inRandomOrder()
            ->take(6)
            ->get();
            
        return response()->json($this->applyPromotions($products));
    }

    public function onSale()
    {
        $allProducts = Product::with('variants')->where('is_active', true)->get();
        $allProductsWithPromo = $this->applyPromotions($allProducts);
        
        $promoProducts = $allProductsWithPromo->filter(function($product) {
            foreach($product->variants as $variant) {
                if ($variant->sale_price > 0 && $variant->sale_price < $variant->price) {
                    return true;
                }
            }
            return false;
        });
        
        return response()->json($promoProducts->take(8)->values());
    }

    public function show($id)
    {
        $product = Product::with([
            'category',
            'variants' => function ($query) {
                $query->withSum('batches', 'stock');
            }
        ])
            ->where('is_active', true)
            ->find($id);

        if (!$product) {
            return response()->json(['message' => 'Sản phẩm không tồn tại'], 404);
        }

        $applied = $this->applyPromotions(collect([$product]));
        return response()->json($applied->first());
    }

    // Admin

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:products,name',
            'slug' => 'required|string|unique:products,slug|max:255',
            'category_id' => 'required|exists:categories,id',
            'description' => 'nullable|string',
            'ingredient' => 'nullable|string',
            'usage_instruction' => 'nullable|string',
            'thumbnail' => 'nullable',
            'variants' => 'required|string' 
        ], [
            'name.unique' => 'Tên sản phẩm này đã tồn tại trong hệ thống.',
            'slug.unique' => 'Đường dẫn sản phẩm (slug) đã tồn tại.'
        ]);

        try {
            DB::beginTransaction();

            $thumbnailPath = null;
            if ($request->hasFile('thumbnail')) {
                $cloudinaryService = app(\App\Services\CloudinaryService::class);
                $publicId = 'products/' . $validated['slug'];
                $thumbnailPath = $cloudinaryService->uploadImage($request->file('thumbnail'), 'products', $publicId);
            } elseif ($request->filled('thumbnail') && is_string($request->input('thumbnail'))) {
                $thumbnailPath = $request->input('thumbnail');
            }

            $product = Product::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'category_id' => $validated['category_id'],
                'description' => $validated['description'] ?? '',
                'ingredient' => $validated['ingredient'] ?? null,
                'usage_instruction' => $validated['usage_instruction'] ?? null,
                'thumbnail' => $thumbnailPath,
                'is_active' => $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true,
            ]);

            $variants = json_decode($request->variants, true);

            foreach ($variants as $variant) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'sku' => $variant['sku'],
                    'weight' => $variant['weight'],
                    'price' => $variant['price'],
                ]);
            }

            DB::commit();

            Cache::forget('active_products');
            return response()->json([
                'message' => 'Sản phẩm đã được tạo thành công!',
                'product' => $product->load('variants')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi khi tạo sản phẩm', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:products,name,' . $product->id,
            'slug' => 'required|string|max:255|unique:products,slug,' . $product->id,
            'category_id' => 'required|exists:categories,id',
            'description' => 'nullable|string',
            'ingredient' => 'nullable|string',
            'usage_instruction' => 'nullable|string',
            'thumbnail' => 'nullable',
            'variants' => 'required|string'
        ], [
            'name.unique' => 'Tên sản phẩm này đã tồn tại trong hệ thống.',
            'slug.unique' => 'Đường dẫn sản phẩm (slug) đã tồn tại.'
        ]);

        try {
            DB::beginTransaction();

            $thumbnailPath = $product->thumbnail;
            if ($request->hasFile('thumbnail')) {
                $cloudinaryService = app(\App\Services\CloudinaryService::class);
                
                if ($thumbnailPath && strpos($thumbnailPath, '/storage/') === 0) {
                    $oldPath = str_replace('/storage/', '', $thumbnailPath);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                } 
                elseif ($thumbnailPath && strpos($thumbnailPath, 'res.cloudinary.com') !== false) {

                }

                $publicId = 'products/' . $validated['slug'];
                $thumbnailPath = $cloudinaryService->uploadImage($request->file('thumbnail'), 'products', $publicId);
            } elseif ($request->filled('thumbnail') && is_string($request->input('thumbnail'))) {
                $thumbnailPath = $request->input('thumbnail');
            }

            $product->update([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'category_id' => $validated['category_id'],
                'description' => $validated['description'] ?? '',
                'ingredient' => $validated['ingredient'] ?? null,
                'usage_instruction' => $validated['usage_instruction'] ?? null,
                'thumbnail' => $thumbnailPath,
                'is_active' => $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : $product->is_active,
            ]);

            $variants = json_decode($request->variants, true);
            $submittedSkus = [];

            foreach ($variants as $variant) {
                $submittedSkus[] = $variant['sku'];
                ProductVariant::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'sku' => $variant['sku']
                    ],
                    [
                        'weight' => $variant['weight'],
                        'price' => $variant['price'],
                    ]
                );
            }

            $variantsToDelete = $product->variants()->whereNotIn('sku', $submittedSkus)->get();
            foreach ($variantsToDelete as $v) {
                try {
                    $v->delete();
                } catch (\Illuminate\Database\QueryException $e) {
                }
            }

            DB::commit();

            Cache::forget('active_products');
            return response()->json([
                'message' => 'Cập nhật sản phẩm thành công!',
                'product' => $product->load('variants')
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Update Product Error: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Lỗi khi cập nhật sản phẩm', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $product = Product::findOrFail($id);
            $product->variants()->delete();
            $product->delete();

            DB::commit();

            Cache::forget('active_products');
            return response()->json(['message' => 'Xóa sản phẩm thành công!'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi khi xóa sản phẩm', 'error' => $e->getMessage()], 500);
        }
    }
}