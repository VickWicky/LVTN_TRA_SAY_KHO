<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $query = Banner::orderBy('sort_order', 'asc');

        if ($search) {
            $query->where('title', 'like', "%{$search}%")
                  ->orWhere('subtitle', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(10));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'cta_text' => 'nullable|string|max:255',
            'cta_link' => ['nullable', 'string', 'max:255', 'regex:/^(https?:\/\/|\/)[a-zA-Z0-9\-._~:\/?#\[\]@!$&\'()*+,;=]+$/'],
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'image' => 'required',
        ]);

        $imagePath = '';
        if ($request->hasFile('image')) {
            $cloudinaryService = app(\App\Services\CloudinaryService::class);
            $publicId = 'banners/banner-' . time();
            $imagePath = $cloudinaryService->uploadImage($request->file('image'), 'banners', $publicId);
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $imagePath = $request->input('image');
        }

        $banner = Banner::create([
            'image_url' => $imagePath,
            'title' => $validated['title'] ?? '',
            'subtitle' => $validated['subtitle'] ?? '',
            'cta_text' => $validated['cta_text'] ?? '',
            'cta_link' => $validated['cta_link'] ?? '',
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['message' => 'Tạo banner thành công', 'banner' => $banner]);
    }

    public function update(Request $request, $id)
    {
        $banner = Banner::findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'cta_text' => 'nullable|string|max:255',
            'cta_link' => ['nullable', 'string', 'max:255', 'regex:/^(https?:\/\/|\/)[a-zA-Z0-9\-._~:\/?#\[\]@!$&\'()*+,;=]+$/'],
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'image' => 'nullable',
        ]);

        $imagePath = $banner->image_url;
        if ($request->hasFile('image')) {
            $cloudinaryService = app(\App\Services\CloudinaryService::class);

            if ($imagePath && strpos($imagePath, '/storage/') === 0) {
                $oldPath = str_replace('/storage/', '', $imagePath);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            } elseif ($imagePath && strpos($imagePath, 'res.cloudinary.com') !== false) {
                $cloudinaryService->deleteImage($imagePath);
            }

            $publicId = 'banners/banner-' . time();
            $imagePath = $cloudinaryService->uploadImage($request->file('image'), 'banners', $publicId);
        } elseif ($request->filled('image') && is_string($request->input('image'))) {
            $imagePath = $request->input('image');
        }

        $banner->update([
            'image_url' => $imagePath,
            'title' => $validated['title'] ?? '',
            'subtitle' => $validated['subtitle'] ?? '',
            'cta_text' => $validated['cta_text'] ?? '',
            'cta_link' => $validated['cta_link'] ?? '',
            'is_active' => $validated['is_active'] ?? $banner->is_active,
            'sort_order' => $validated['sort_order'] ?? $banner->sort_order,
        ]);

        return response()->json(['message' => 'Cập nhật banner thành công', 'banner' => $banner]);
    }

    public function destroy($id)
    {
        $banner = Banner::findOrFail($id);
        
        if ($banner->image_url && strpos($banner->image_url, '/storage/') === 0) {
            $oldPath = str_replace('/storage/', '', $banner->image_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        } elseif ($banner->image_url && strpos($banner->image_url, 'res.cloudinary.com') !== false) {
            $cloudinaryService = app(\App\Services\CloudinaryService::class);
            $cloudinaryService->deleteImage($banner->image_url);
        }
        
        $banner->delete();

        return response()->json(['message' => 'Xóa banner thành công']);
    }
}
