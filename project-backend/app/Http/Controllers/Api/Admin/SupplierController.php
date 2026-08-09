<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Supplier;
use App\Rules\ValidPhoneNumber;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $query = Supplier::orderBy('created_at', 'desc');

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(10));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:suppliers,name',
            'phone' => ['nullable', 'string', 'max:20', new ValidPhoneNumber],
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500'
        ], [
            'name.unique' => 'Tên nhà cung cấp này đã tồn tại trong hệ thống.'
        ]);

        $supplier = Supplier::create($validated);
        
        return response()->json([
            'message' => 'Tạo nhà cung cấp thành công.',
            'supplier' => $supplier
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => "required|string|max:255|unique:suppliers,name,{$id}",
            'phone' => ['nullable', 'string', 'max:20', new ValidPhoneNumber],
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500'
        ], [
            'name.unique' => 'Tên nhà cung cấp này đã tồn tại trong hệ thống.'
        ]);

        $supplier = Supplier::findOrFail($id);
        $supplier->update($validated);
        
        return response()->json([
            'message' => 'Cập nhật nhà cung cấp thành công.',
            'supplier' => $supplier
        ]);
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        
        // Kiểm tra xem nhà cung cấp đã có phiếu nhập nào chưa
        if ($supplier->importReceipts()->exists()) {
            return response()->json([
                'message' => 'Không thể xóa nhà cung cấp đã có phiếu nhập.'
            ], 400);
        }

        $supplier->delete();
        return response()->json(['message' => 'Xóa nhà cung cấp thành công.']);
    }
}
