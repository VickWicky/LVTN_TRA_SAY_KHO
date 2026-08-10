<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\MassPrunable;

class ChatSession extends Model
{
    use HasFactory, MassPrunable;

    protected $fillable = ['user_id', 'session_token'];
    public const UPDATED_AT = null;

    public function prunable()
    {
        return static::where('created_at', '<', now()->subDays(15));
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }
}
