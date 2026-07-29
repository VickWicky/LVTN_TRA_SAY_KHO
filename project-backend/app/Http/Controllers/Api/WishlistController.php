<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Wishlist;
use Carbon\Carbon;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $user_id = $request->user()->id;
        $wishlists = Wishlist::with('product.variants')
            ->where('user_id', $user_id)
            ->get();

        // Extract products from wishlists
        $products = $wishlists->map(function ($item) {
            return $item->product;
        })->filter()->values();

        return response()->json($products);
    }

    public function toggle(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id'
        ]);

        $user_id = $request->user()->id;
        $product_id = $request->product_id;

        $deleted = Wishlist::where('user_id', $user_id)
            ->where('product_id', $product_id)
            ->delete();

        if ($deleted) {
            return response()->json(['status' => 'removed', 'message' => 'Đã xóa khỏi danh sách yêu thích']);
        } else {
            Wishlist::create([
                'user_id' => $user_id,
                'product_id' => $product_id,
                'created_at' => Carbon::now()
            ]);
            return response()->json(['status' => 'added', 'message' => 'Đã thêm vào danh sách yêu thích']);
        }
    }
}
