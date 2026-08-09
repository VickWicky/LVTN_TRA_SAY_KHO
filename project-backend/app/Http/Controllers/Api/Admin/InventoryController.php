<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Batch;
use App\Models\ImportReceipt;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function getSuppliers()
    {
        $suppliers = Supplier::all();
        return response()->json($suppliers);
    }

    public function getReceipts(Request $request)
    {
        $search = $request->input('search');
        $query = ImportReceipt::with(['supplier', 'user', 'batches.variant.product'])->orderBy('created_at', 'desc');

        if ($search) {
            $query->whereHas('supplier', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            })->orWhere('id', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(10));
    }

    public function getInventory(Request $request)
    {
        $search = $request->input('search');
        $query = Batch::with(['variant.product'])->orderBy('created_at', 'desc');

        if ($search) {
            $query->where('batch_code', 'like', "%{$search}%")
                  ->orWhereHas('variant.product', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
        }
        
        $paginated = $query->paginate(10);
        
        // Format to match frontend expectations
        $paginated->getCollection()->transform(function ($batch) {
            return [
                'id' => $batch->id,
                'batch_code' => $batch->batch_code,
                'variant' => $batch->variant,
                'initial_quantity' => $batch->quantity,
                'current_quantity' => $batch->stock,
                'exp_date' => $batch->expiry_date,
            ];
        });

        return response()->json($paginated);
    }

    public function importInventory(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.import_price' => 'required|numeric|min:0',
            'items.*.mfg_date' => 'required|date|before_or_equal:today',
            'items.*.exp_date' => 'required|date|after:items.*.mfg_date',
        ], [
            'items.*.mfg_date.before_or_equal' => 'Ngày sản xuất không được lớn hơn ngày hiện tại.',
        ]);

        $minValidDate = now()->addDays(30)->startOfDay();

        foreach ($validated['items'] as $index => $item) {
            $expDate = \Carbon\Carbon::parse($item['exp_date']);
            if ($expDate->lessThan($minValidDate)) {
                return response()->json([
                    'message' => 'Lô hàng không hợp lệ (Cận date)',
                    'errors' => ["items.{$index}.exp_date" => ['Hạn sử dụng quá ngắn. Sản phẩm phải còn hạn ít nhất 30 ngày để đảm bảo an toàn.']]
                ], 422);
            }

            $variant = \App\Models\ProductVariant::find($item['variant_id']);
            if ($variant && $item['import_price'] > $variant->price) {
                return response()->json([
                    'message' => 'Lô hàng không hợp lệ (Lỗ vốn)',
                    'errors' => ["items.{$index}.import_price" => ["Giá nhập (" . number_format($item['import_price']) . "đ) không được cao hơn giá bán lẻ (" . number_format($variant->price) . "đ)."]]
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // Lấy user_id tạm nếu không có admin auth
            $user_id = auth('sanctum')->id();
            if (!$user_id) {
                $user = User::first();
                $user_id = $user ? $user->id : 1;
            }

            // Tính toán tổng tiền thực tế
            $calculatedTotal = 0;
            foreach ($validated['items'] as $item) {
                $calculatedTotal += ($item['quantity'] * $item['import_price']);
            }

            $receipt = ImportReceipt::create([
                'supplier_id' => $validated['supplier_id'],
                'user_id' => $user_id, 
                'total_amount' => $calculatedTotal,
                'status' => 'completed'
            ]);

            $todayPrefix = 'B-' . date('Ymd') . '-';
            $lastBatch = Batch::where('batch_code', 'like', $todayPrefix . '%')
                              ->orderBy('batch_code', 'desc')
                              ->first();
            
            $nextSequence = 1;
            if ($lastBatch) {
                $lastSequence = (int) str_replace($todayPrefix, '', $lastBatch->batch_code);
                $nextSequence = $lastSequence + 1;
            }

            foreach ($validated['items'] as $item) {
                $batchCode = $todayPrefix . str_pad($nextSequence++, 2, '0', STR_PAD_LEFT);

                Batch::create([
                    'import_receipt_id' => $receipt->id,
                    'variant_id' => $item['variant_id'],
                    'batch_code' => $batchCode,
                    'manufacture_date' => $item['mfg_date'],
                    'expiry_date' => $item['exp_date'],
                    'import_price' => $item['import_price'],
                    'quantity' => $item['quantity'],
                    'stock' => $item['quantity'],
                ]);
            }

            DB::commit();

            return response()->json(['message' => 'Imported successfully'], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Import failed', 'error' => $e->getMessage()], 500);
        }
    }
}
