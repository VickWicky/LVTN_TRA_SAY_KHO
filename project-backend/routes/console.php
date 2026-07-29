<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\ChatSession;
use App\Models\ChatMessage;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule database pruning for old chatbot sessions and messages daily
Schedule::command('model:prune', [
    '--model' => [ChatSession::class, ChatMessage::class],
])->daily();
