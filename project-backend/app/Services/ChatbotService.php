<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotService
{
    protected $toolCallingService;

    public function __construct(ToolCallingService $toolCallingService)
    {
        $this->toolCallingService = $toolCallingService;
    }

    public function getSystemInstruction($userId = null): array
    {
        $loginStatus = $userId ? "ĐÃ ĐĂNG NHẬP" : "CHƯA ĐĂNG NHẬP";
        
        return [
            'parts' => [
                ['text' => 'Bạn là Senior AI Engineer và Senior Laravel Developer. Bạn là AI Chatbot hỗ trợ mua hàng cho website thương mại điện tử "CK TEA" bán các loại trà sấy khô.

MỤC TIÊU VÀ NGHIỆP VỤ DUY NHẤT:
- Tư vấn sản phẩm, gợi ý theo nhu cầu, tìm kiếm, so sánh sản phẩm.
- Kiểm tra giá, tồn kho, giải thích đóng gói, chính sách, hướng dẫn thanh toán.
- Thêm/sửa giỏ hàng, tạo đơn hàng, theo dõi đơn hàng (nếu đã đăng nhập).
- TUYỆT ĐỐI KHÔNG trả lời các câu hỏi ngoài phạm vi website (Toán học, Lịch sử, Chính trị, Tin tức, Bóng đá, Lập trình, Kiến thức chung...). Nếu bị hỏi ngoài phạm vi, hãy trả lời: "Xin lỗi, tôi chỉ hỗ trợ tư vấn và đặt hàng các sản phẩm trên website CK TEA."

NGUYÊN TẮC:
- KHÔNG ĐƯỢC tự nghĩ ra thông tin (giá, tồn kho, thành phần, mô tả, khuyến mãi).
- LUÔN LUÔN dùng tool để lấy dữ liệu từ hệ thống. Nếu tool trả về lỗi hoặc không tìm thấy, hãy trả lời: "Xin lỗi, hiện tại tôi chưa tìm thấy thông tin này."
- Nếu không chắc chắn, không suy diễn.

QUY TRÌNH MUA HÀNG:
1. Khi khách muốn mua: BẮT BUỘC phải gọi tool get_product_details để lấy chính xác variant_id của sản phẩm đó. TUYỆT ĐỐI KHÔNG tự bịa variant_id.
2. Sau khi có variant_id và đủ tồn kho -> Gọi tool add_to_cart để thêm vào giỏ hàng. LƯU Ý: NẾU khách thêm nhiều sản phẩm khác nhau, BẮT BUỘC phải gọi tool add_to_cart TƯƠNG ỨNG NHIỀU LẦN.
3. CHỈ KHI tool add_to_cart trả về thành công mới được báo cho khách. TUYỆT ĐỐI KHÔNG báo đã thêm thành công nếu chưa gọi tool.
4. Khi khách muốn đặt hàng, kiểm tra giỏ hàng (dùng view_cart). Sau đó yêu cầu lấy đủ thông tin: Tên, SĐT, Địa chỉ, Phương thức thanh toán (COD hoặc VNPAY).
5. NẾU KHÁCH CHỌN VNPAY: 
   - Nếu Trạng thái là CHƯA ĐĂNG NHẬP: Hãy báo cho khách biết thanh toán VNPAY cần đăng nhập. Khuyên họ "Vui lòng [đăng nhập tại đây](/login) trước khi thanh toán VNPAY. Sau khi đăng nhập, hãy mở lại chat và chúng ta sẽ tiếp tục!". KHÔNG GỌI checkout_order.
   - Nếu Trạng thái là ĐÃ ĐĂNG NHẬP: Tiến hành đặt hàng bình thường và gọi checkout_order.
6. Trước khi tạo đơn, phải liệt kê: Danh sách SP, Số lượng, Đơn giá, Tổng tiền, Địa chỉ, Người nhận, SĐT, Hình thức thanh toán. Hỏi: "Bạn xác nhận đặt hàng chứ?"
7. Chỉ khi khách XÁC NHẬN ĐỒNG Ý, mới gọi tool checkout_order. (LƯU Ý: TUYỆT ĐỐI KHÔNG gọi lại tool add_to_cart lúc này vì sản phẩm đã có sẵn trong giỏ hàng, gọi lại sẽ làm nhân đôi số lượng).
8. NẾU tool checkout_order trả về vnpay_url, BẮT BUỘC bạn phải hiển thị một thẻ HTML <a> để khách bấm vào thanh toán. Ví dụ: "Đơn hàng của bạn đã được tạo thành công! Vui lòng bấm vào <a href=\"URL_VNPAY\" class=\"text-primary font-bold underline\">ĐÂY</a> để tiến hành thanh toán."

PHONG CÁCH:
- Ngắn gọn, lịch sự, hội thoại, dễ hiểu, không viết quá dài.
- Có thể sử dụng các thẻ HTML cơ bản (như <a>, <b>, <i>, <br>) để làm đẹp văn bản trả về nếu cần thiết.

*** TRẠNG THÁI HIỆN TẠI CỦA KHÁCH HÀNG: ' . $loginStatus . ' ***']
            ]
        ];
    }

    public function handleUserMessage(array $messages, $userId = null, $sessionToken = null): array
    {
        $apiKey = env('GEMINI_API_KEY');
        if (empty($apiKey)) {
            Log::error('Gemini API Error: GEMINI_API_KEY is missing in .env');
            return [
                'role' => 'model',
                'content' => 'Xin lỗi, hệ thống AI chưa được cấu hình API Key.'
            ];
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={$apiKey}";
        
        $tools = $this->toolCallingService->getToolsDefinition();
        
        $payload = [
            'systemInstruction' => $this->getSystemInstruction($userId),
            'contents' => $messages,
            'tools' => [
                [
                    'functionDeclarations' => $tools
                ]
            ],
            // 'toolConfig' => [
            //     'functionCallingConfig' => ['mode' => 'AUTO']
            // ]
        ];

        try {
            Log::info('Gemini Payload: ' . json_encode($payload, JSON_UNESCAPED_UNICODE));
            $response = Http::withHeaders(['Content-Type' => 'application/json'])
                ->timeout(30)
                ->post($url, $payload);

            if ($response->failed()) {
                Log::error('Gemini API Request Failed', ['body' => $response->body()]);
                return [
                    'role' => 'model',
                    'content' => 'Xin lỗi, kết nối tới Gemini đang gặp sự cố. Vui lòng thử lại.'
                ];
            }

            $data = $response->json();
            Log::info('Gemini Response: ' . json_encode($data, JSON_UNESCAPED_UNICODE));
            
            if (!isset($data['candidates'][0]['content']['parts'])) {
                Log::error('Gemini returned unexpected format', ['data' => $data]);
                return [
                    'role' => 'model',
                    'content' => 'Xin lỗi, tôi không thể xử lý câu trả lời lúc này.'
                ];
            }

            $parts = $data['candidates'][0]['content']['parts'];
            
            // Fix PHP json_encode issue where empty object {} becomes empty array []
            foreach ($parts as &$part) {
                if (isset($part['functionCall'])) {
                    if (!isset($part['functionCall']['args']) || empty($part['functionCall']['args'])) {
                        $part['functionCall']['args'] = new \stdClass();
                    }
                }
            }
            unset($part);

            // Check if there is a function call
            $toolCallsToExecute = [];
            $textResponse = '';
            
            foreach ($parts as $part) {
                if (isset($part['functionCall'])) {
                    $toolCallsToExecute[] = $part['functionCall'];
                }
                if (isset($part['text'])) {
                    $textResponse .= $part['text'];
                }
            }

            if (count($toolCallsToExecute) > 0) {
                // Add the model's functionCall to message history
                $messages[] = [
                    'role' => 'model',
                    'parts' => $parts
                ];
                
                $functionResponses = [];
                
                foreach ($toolCallsToExecute as $call) {
                    $functionName = $call['name'];
                    $args = $call['args'] ?? [];
                    $argsArray = is_object($args) ? (array) $args : $args;
                    
                    // Execute tool locally
                    $resultJson = $this->toolCallingService->executeTool($functionName, $argsArray, $userId, $sessionToken);
                    
                    // Decode so we can pass as an object to Gemini
                    $resultData = json_decode($resultJson, true);
                    Log::info("Tool Result for $functionName: $resultJson");
                    
                    $functionResponses[] = [
                        'functionResponse' => [
                            'name' => $functionName,
                            'response' => [
                                'name' => $functionName,
                                'content' => $resultData
                            ]
                        ]
                    ];
                }

                // Add functionResponse to messages
                $messages[] = [
                    'role' => 'user',
                    'parts' => $functionResponses
                ];

                // Call Gemini again with the tool result
                return $this->handleUserMessage($messages, $userId, $sessionToken);
            }

            // Normal text response
            return [
                'role' => 'model',
                'content' => $textResponse
            ];

        } catch (\Exception $e) {
            Log::error('Gemini API Error: ' . $e->getMessage());
            return [
                'role' => 'model',
                'content' => 'Xin lỗi, hệ thống của tôi đang gặp chút sự cố kỹ thuật. Vui lòng thử lại sau.'
            ];
        }
    }
}
