<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\Admin\SupplierController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\PromotionController;
use App\Http\Controllers\Api\Admin\BannerController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\Admin\AccountController;
use App\Http\Controllers\Api\Admin\InventoryController;

// Public Info
Route::get('/public/banners', [PublicController::class, 'getBanners']);
Route::get('/public/settings', [PublicController::class, 'getSettings']);

// Auth
Route::middleware('throttle:15,1')->group(function () {
    Route::post('/auth/google', [AuthController::class, 'googleLogin']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/payment/vnpay/create-url', [\App\Http\Controllers\Api\PaymentController::class, 'createVnpayUrl']);
});

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/on-sale', [ProductController::class, 'onSale']);
Route::get('/products/top-random', [ProductController::class, 'topRandom']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/{id}/related', [ProductController::class, 'getRelated']);
Route::get('/categories', [ProductController::class, 'getCategories']);

Route::post('/orders', [OrderController::class, 'store']);
Route::post('/payment/vnpay/verify', [\App\Http\Controllers\Api\PaymentController::class, 'verifyVnpay']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    });
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'changePassword']);
    Route::get('/user/orders', [OrderController::class, 'userOrders']);
    Route::put('/user/orders/{id}/cancel', [OrderController::class, 'cancelOrder']);
    Route::put('/user/orders/{id}/shipping', [OrderController::class, 'updateShipping']);
    
    // Wishlist
    Route::get('/wishlists', [WishlistController::class, 'index']);
    Route::post('/wishlists/toggle', [WishlistController::class, 'toggle']);
});

// Contact API (Public)
Route::post('/contacts', [ContactController::class, 'store']);

// Route Chatbot API (Public)
Route::post('/chat', [ChatController::class, 'sendMessage']);

// Admin API
Route::prefix('admin')
    ->middleware(['auth:sanctum'])
    ->group(function () {
        Route::get('/dashboard-stats', [AdminController::class, 'dashboardStats'])->middleware('permission:view-dashboard');
        Route::get('/categories/active', [ProductController::class, 'getCategories'])->middleware('permission:manage-categories|view-categories');
        Route::get('/categories', [AdminCategoryController::class, 'index'])->middleware('permission:manage-categories|view-categories');
        Route::post('/categories', [AdminCategoryController::class, 'store'])->middleware('permission:manage-categories');
        Route::put('/categories/{id}', [AdminCategoryController::class, 'update'])->middleware('permission:manage-categories');
        Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy'])->middleware('permission:manage-categories');
        
        Route::get('/products', [ProductController::class, 'adminIndex'])->middleware('permission:manage-products|view-products');
        Route::post('/products', [ProductController::class, 'store'])->middleware('permission:manage-products');
        Route::put('/products/{id}', [ProductController::class, 'update'])->middleware('permission:manage-products');
        Route::delete('/products/{id}', [ProductController::class, 'destroy'])->middleware('permission:manage-products');
        
        Route::get('/orders', [AdminOrderController::class, 'index'])->middleware('permission:manage-orders');
        Route::get('/orders/{id}', [AdminOrderController::class, 'show'])->middleware('permission:manage-orders');
        Route::put('/orders/{id}/status', [AdminOrderController::class, 'updateStatus'])->middleware('permission:manage-orders');
        Route::patch('/orders/{id}/shipping', [AdminOrderController::class, 'updateShipping'])->middleware('permission:manage-orders');
        Route::post('/orders/{id}/refund', [AdminOrderController::class, 'retryRefund'])->middleware('permission:manage-orders');
        Route::put('/orders/{id}/payment-status', [AdminOrderController::class, 'updatePaymentStatus'])->middleware('permission:manage-orders');
        
        Route::get('/inventory', [InventoryController::class, 'getInventory'])->middleware('permission:manage-import');
        Route::get('/inventory/suppliers', [InventoryController::class, 'getSuppliers'])->middleware('permission:manage-import');
        Route::get('/inventory/receipts', [InventoryController::class, 'getReceipts'])->middleware('permission:manage-import');
        Route::post('/inventory/import', [InventoryController::class, 'importInventory'])->middleware('permission:manage-import');
        
        // Inventory-log
        Route::get('/inventory-logs', [\App\Http\Controllers\Api\Admin\InventoryLogController::class, 'index'])->middleware('permission:manage-import');
        Route::post('/inventory-logs', [\App\Http\Controllers\Api\Admin\InventoryLogController::class, 'store'])->middleware('permission:manage-import');
        
        // Contacts
        Route::get('/contacts', [ContactController::class, 'index'])->middleware('permission:manage-contacts');
        Route::put('/contacts/{id}/status', [ContactController::class, 'updateStatus'])->middleware('permission:manage-contacts');
        Route::delete('/contacts/{id}', [ContactController::class, 'destroy'])->middleware('permission:manage-contacts');
        
        // Accounts
        Route::get('/accounts', [AccountController::class, 'index'])->middleware('permission:manage-users|view-users');
        Route::put('/accounts/{id}', [AccountController::class, 'updateAccount'])->middleware('permission:manage-users');
        Route::put('/accounts/{id}/status', [AccountController::class, 'updateStatus'])->middleware('permission:manage-users');
        Route::post('/accounts', [AccountController::class, 'store'])->middleware('permission:manage-users');

        // Roles & Permissions
        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:manage-users');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:manage-users');
        Route::put('/roles/{id}', [RoleController::class, 'update'])->middleware('permission:manage-users');
        Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('permission:manage-users');
        Route::get('/permissions', [RoleController::class, 'permissions'])->middleware('permission:manage-users');

        // Suppliers
        Route::apiResource('/suppliers', SupplierController::class);

        // Promotions
        Route::get('/promotions/{id}/stats', [PromotionController::class, 'stats']);
        Route::apiResource('/promotions', PromotionController::class);

        // Banners
        Route::apiResource('/banners', BannerController::class);

        // Settings
        Route::get('/settings', [SettingController::class, 'index']);
        Route::post('/settings', [SettingController::class, 'update']);
    });