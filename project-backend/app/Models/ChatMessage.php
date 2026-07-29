<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\MassPrunable;

class ChatMessage extends Model
{
    use HasFactory, MassPrunable;

    protected $fillable = ['chat_session_id', 'role', 'content', 'tool_calls'];

    /**
     * Get the prunable model query.
     */
    public function prunable()
    {
        // Delete messages older than 15 days
        return static::where('created_at', '<', now()->subDays(15));
    }

    public function session()
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }
}
