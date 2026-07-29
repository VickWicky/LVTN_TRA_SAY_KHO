<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\MassPrunable;

class ChatSession extends Model
{
    use HasFactory, MassPrunable;

    protected $fillable = ['user_id', 'session_token'];

    /**
     * Get the prunable model query.
     */
    public function prunable()
    {
        // Delete sessions older than 15 days
        return static::where('updated_at', '<', now()->subDays(15));
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
