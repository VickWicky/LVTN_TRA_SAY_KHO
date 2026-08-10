<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('import_receipts', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });

        Schema::table('inventory_logs', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });

        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['tool_calls', 'updated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_receipts', function (Blueprint $table) {
            $table->timestamp('updated_at')->nullable();
        });

        Schema::table('inventory_logs', function (Blueprint $table) {
            $table->timestamp('updated_at')->nullable();
        });

        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->timestamp('updated_at')->nullable();
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->json('tool_calls')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }
};
