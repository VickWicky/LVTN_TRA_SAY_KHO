<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InventoryLog;
use App\Models\Batch;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InventoryLogController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryLog::with(['user', 'batch.variant.product'])->orderBy('created_at', 'desc');

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->has('reason') && $request->reason) {
            $query->where('reason', $request->reason);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('batch', function($q) use ($search) {
                $q->where('batch_code', 'like', "%{$search}%")
                  ->orWhereHas('variant.product', function($q2) use ($search) {
                      $q2->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $logs = $query->paginate(10);
        return response()->json($logs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|exists:batches,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:255',
            'custom_reason' => 'nullable|string|max:255'
        ]);

        try {
            DB::beginTransaction();

            $batch = Batch::lockForUpdate()->findOrFail($validated['batch_id']);

            if ($batch->stock < $validated['quantity']) {
                throw new \Exception("Số lượng tồn kho không đủ (Hiện tại: {$batch->stock})");
            }

            $batch->stock -= $validated['quantity'];
            $batch->save();

            $user_id = auth('sanctum')->id();
            if (!$user_id) {
                $user = User::first();
                $user_id = $user ? $user->id : 1;
            }

            $finalReason = $validated['reason'];
            if ($finalReason === 'Khác' && !empty($validated['custom_reason'])) {
                $finalReason = $validated['custom_reason'];
            }

            $log = InventoryLog::create([
                'batch_id' => $batch->id,
                'quantity' => $validated['quantity'],
                'reason' => $finalReason,
                'user_id' => $user_id
            ]);

            DB::commit();
            
            $log->load(['user', 'batch.variant.product']);
            
            return response()->json([
                'message' => 'Xuất kho thành công',
                'data' => $log
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Xuất kho thất bại', 'error' => $e->getMessage()], 400);
        }
    }
}
