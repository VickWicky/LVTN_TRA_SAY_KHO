<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $guarded = [];

    public static function get($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        if ($setting) {
            $val = json_decode($setting->value, true);
            return (json_last_error() === JSON_ERROR_NONE) ? $val : $setting->value;
        }
        return $default;
    }
}
