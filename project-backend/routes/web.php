<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Fallback phục vụ file ảnh trên Windows khi symlink bị lỗi
Route::get('storage/{folder}/{filename}', function ($folder, $filename) {
    $path = storage_path('app/public/' . $folder . '/' . $filename);
    if (!file_exists($path)) {
        abort(404);
    }
    return response()->file($path);
})->where('filename', '.*');
Route::get('/clear-cache', function () { \Artisan::call('optimize:clear'); return 'Cache cleared'; });
