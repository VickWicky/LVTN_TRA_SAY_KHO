<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Contact;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    // API cho frontend (trang chủ) gửi liên hệ
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|min:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $contact = Contact::create($validator->validated());

        event(new \App\Events\ContactCreated($contact));

        return response()->json([
            'message' => 'Gửi liên hệ thành công.',
            'contact' => $contact
        ], 201);
    }

    // API cho admin lấy danh sách
    public function index(Request $request)
    {
        $search = $request->input('search');
        $query = Contact::orderBy('created_at', 'desc');

        if ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(10));
    }

    // API cho admin cập nhật trạng thái (new, read, resolved)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:new,read,resolved'
        ]);

        $contact = Contact::findOrFail($id);
        $contact->status = $request->status;
        $contact->save();

        return response()->json([
            'message' => 'Cập nhật trạng thái thành công',
            'contact' => $contact
        ]);
    }

    // API cho admin xóa liên hệ
    public function destroy($id)
    {
        $contact = Contact::findOrFail($id);
        $contact->delete();
        
        return response()->json(['message' => 'Xóa liên hệ thành công']);
    }
}
