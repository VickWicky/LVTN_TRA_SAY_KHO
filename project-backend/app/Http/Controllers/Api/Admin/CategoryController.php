<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $query = Category::orderBy('id', 'desc');
        
        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
        }
        
        return response()->json($query->paginate(10));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:categories,slug|max:255',
            'is_active' => 'boolean'
        ]);

        try {
            $category = Category::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'is_active' => $request->has('is_active') ? $request->is_active : true,
            ]);

            Cache::forget('active_categories');
            return response()->json([
                'message' => 'Tạo danh mục thành công!',
                'category' => $category
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi khi tạo danh mục', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:categories,slug,' . $category->id,
            'is_active' => 'boolean'
        ]);

        try {
            $category->update([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'is_active' => $request->has('is_active') ? $request->is_active : $category->is_active,
            ]);

            Cache::forget('active_categories');
            return response()->json([
                'message' => 'Cập nhật danh mục thành công!',
                'category' => $category
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi khi cập nhật danh mục', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $category = Category::find($id);
        
        if (!$category) {
            return response()->json(['message' => 'Không tìm thấy danh mục.'], 404);
        }

        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục.'
            ], 400);
        }

        try {
            $category->delete();
            Cache::forget('active_categories');
            return response()->json(['message' => 'Xóa danh mục thành công!'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi khi xóa danh mục', 'error' => $e->getMessage()], 500);
        }
    }
}
