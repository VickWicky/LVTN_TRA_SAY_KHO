<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all();
        $formatted = [];
        foreach ($settings as $setting) {
            $val = json_decode($setting->value, true);
            $formatted[$setting->key] = (json_last_error() === JSON_ERROR_NONE) ? $val : $setting->value;
        }
        return response()->json($formatted);
    }

    public function update(Request $request)
    {
        $data = $request->all();

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $value = json_encode($value);
            }

            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        return response()->json(['message' => 'Lưu cấu hình thành công']);
    }
}
