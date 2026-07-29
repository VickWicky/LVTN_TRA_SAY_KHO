<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\Setting;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function getBanners()
    {
        $banners = Banner::where('is_active', true)->orderBy('sort_order', 'asc')->get();
        return response()->json($banners);
    }

    public function getSettings()
    {
        $settings = Setting::all();
        $formatted = [];
        foreach ($settings as $setting) {
            $val = json_decode($setting->value, true);
            $formatted[$setting->key] = (json_last_error() === JSON_ERROR_NONE) ? $val : $setting->value;
        }
        return response()->json($formatted);
    }
}
