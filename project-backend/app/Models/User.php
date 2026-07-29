<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    // HasRoles cung cấp: assignRole(), hasRole(), hasPermissionTo(), v.v.
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * Các trường được phép điền dữ liệu vào Database.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id', // Đã thêm
        'avatar',    // Đã thêm
        'phone',     // Đã thêm
        'address',   // Đã thêm
    ];

    /**
     * Các trường cần được giấu đi khi trả về API.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Định dạng kiểu dữ liệu.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}