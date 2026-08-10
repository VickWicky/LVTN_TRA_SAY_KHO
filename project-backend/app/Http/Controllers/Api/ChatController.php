<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\ChatbotService;
use App\Models\ChatSession;
use App\Models\ChatMessage;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    protected $chatbotService;

    public function __construct(ChatbotService $chatbotService)
    {
        $this->chatbotService = $chatbotService;
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'session_token' => 'nullable|string'
        ]);

        $message = $request->message;
        if (php_sapi_name() === 'cli-server' && strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            if (!mb_check_encoding($message, 'UTF-8') || preg_match('/[\x80-\xFF]/', $message)) {
                $decoded = utf8_decode($message);
                if (mb_check_encoding($decoded, 'UTF-8')) {
                    $message = mb_convert_encoding($message, 'ISO-8859-1', 'UTF-8');
                }
            }
        }
        
        \Illuminate\Support\Facades\Log::info('Received message:', ['msg' => $message]);

        $userId = auth('sanctum')->id();
        $sessionToken = $request->input('session_token');

        $session = null;
        if ($sessionToken) {
            $session = ChatSession::firstOrCreate(
                ['session_token' => $sessionToken]
            );

            if ($userId && !$session->user_id) {
                $session->user_id = $userId;
                $session->save();
            }
        } else {
            if ($userId) {
                $session = ChatSession::where('user_id', $userId)->latest()->first();
                if (!$session) {
                    $session = ChatSession::create([
                        'user_id' => $userId,
                        'session_token' => Str::random(40)
                    ]);
                }
            } else {
                $session = ChatSession::create([
                    'session_token' => Str::random(40)
                ]);
            }
        }

        $previousMessages = ChatMessage::where('chat_session_id', $session->id)
            ->orderBy('id', 'desc')
            ->take(20)
            ->get()
            ->reverse();

        $messages = [];

        foreach ($previousMessages as $msg) {
            if ($msg->role === 'user' || $msg->role === 'model' || $msg->role === 'assistant') {
                $role = $msg->role === 'assistant' ? 'model' : $msg->role;
                
                $messages[] = [
                    'role' => $role,
                    'parts' => [
                        ['text' => $msg->content ?? '']
                    ]
                ];
            }
        }

        $messages[] = [
            'role' => 'user',
            'parts' => [
                ['text' => $message]
            ]
        ];

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'role' => 'user',
            'content' => $message
        ]);

        $aiResponse = $this->chatbotService->handleUserMessage($messages, $userId, $session->session_token);

        ChatMessage::create([
            'chat_session_id' => $session->id,
            'role' => 'assistant',
            'content' => $aiResponse['content'] ?? ''
        ]);

        return response()->json([
            'status' => 'success',
            'session_token' => $session->session_token,
            'reply' => $aiResponse['content'] ?? ''
        ]);
    }
}
