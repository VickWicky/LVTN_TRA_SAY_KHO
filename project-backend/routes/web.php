<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/', function () {
    return view('welcome');
});

Route::get('storage/{folder}/{filename}', function ($folder, $filename) {
    $path = storage_path('app/public/' . $folder . '/' . $filename);
    if (!file_exists($path)) {
        abort(404);
    }
    return response()->file($path);
})->where('filename', '.*');
Route::get('/clear-cache', function () { \Artisan::call('optimize:clear'); return 'Cache cleared'; });

Route::get('/chay-migrate', function () {
    Artisan::call('migrate', ['--force' => true]);
    return "Đã tạo cột refunded_at thành công rực rỡ!";
});