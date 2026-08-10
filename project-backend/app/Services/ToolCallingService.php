<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ToolCallingService
{
    public function getToolsDefinition(): array
    {
        return [
            [
                'name' => 'search_products',
                'description' => 'Tìm kiếm sản phẩm theo tên hoặc từ khóa (keyword)',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'keyword' => [
                            'type' => 'STRING',
                            'description' => 'Từ khóa tìm kiếm, ví dụ: "trà ô long", "hoa cúc"'
                        ]
                    ],
                    'required' => ['keyword']
                ]
            ],
            [
                'name' => 'search_by_need',
                'description' => 'Gợi ý sản phẩm theo nhu cầu sức khỏe hoặc công dụng (ví dụ: ngủ ngon, giảm cân, thanh nhiệt)',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'need' => [
                            'type' => 'STRING',
                            'description' => 'Nhu cầu của khách hàng, ví dụ: "ngủ ngon", "giảm cân", "đẹp da"'
                        ]
                    ],
                    'required' => ['need']
                ]
            ],
            [
                'name' => 'get_product_details',
                'description' => 'Lấy thông tin chi tiết của một sản phẩm (giá, khối lượng, tồn kho) dựa vào ID sản phẩm',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'product_id' => [
                            'type' => 'INTEGER',
                            'description' => 'ID của sản phẩm'
                        ]
                    ],
                    'required' => ['product_id']
                ]
            ],
            [
                'name' => 'add_to_cart',
                'description' => 'Thêm một sản phẩm vào giỏ hàng ảo của chatbot. Yêu cầu có variant_id (phải dùng get_product_details trước để lấy variant_id tương ứng với khối lượng khách chọn).',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'variant_id' => [
                            'type' => 'INTEGER',
                            'description' => 'ID của biến thể sản phẩm (không phải product_id)'
                        ],
                        'quantity' => [
                            'type' => 'INTEGER',
                            'description' => 'Số lượng cần thêm'
                        ]
                    ],
                    'required' => ['variant_id', 'quantity']
                ]
            ],
            [
                'name' => 'view_cart',
                'description' => 'Xem danh sách các sản phẩm đang có trong giỏ hàng ảo của chatbot.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'dummy' => [
                            'type' => 'STRING',
                            'description' => 'Tham số giả (không cần truyền)'
                        ]
                    ]
                ]
            ],
            [
                'name' => 'remove_from_cart',
                'description' => 'Xóa một sản phẩm khỏi giỏ hàng ảo của chatbot dựa vào variant_id.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'variant_id' => [
                            'type' => 'INTEGER',
                            'description' => 'ID của biến thể sản phẩm cần xóa'
                        ]
                    ],
                    'required' => ['variant_id']
                ]
            ],
            [
                'name' => 'checkout_order',
                'description' => 'Tiến hành chốt đơn (tạo đơn hàng) từ giỏ hàng ảo. Phải yêu cầu khách cung cấp đầy đủ thông tin trước khi gọi tool này.',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'shipping_name' => [
                            'type' => 'STRING',
                            'description' => 'Họ và tên người nhận'
                        ],
                        'shipping_phone' => [
                            'type' => 'STRING',
                            'description' => 'Số điện thoại người nhận (10 chữ số)'
                        ],
                        'shipping_address' => [
                            'type' => 'STRING',
                            'description' => 'Địa chỉ giao hàng chi tiết'
                        ],
                        'payment_method' => [
                            'type' => 'STRING',
                            'description' => 'Phương thức thanh toán: "cod" hoặc "vnpay"'
                        ]
                    ],
                    'required' => ['shipping_name', 'shipping_phone', 'shipping_address', 'payment_method']
                ]
            ]
        ];
    }

    public function executeTool(string $name, array $arguments, $userId = null, $sessionToken = null): string
    {
        Log::info("Executing Tool: $name", $arguments);

        try {
            switch ($name) {
                case 'search_products':
                    return $this->searchProducts($arguments['keyword']);
                case 'search_by_need':
                    return $this->searchByNeed($arguments['need']);
                case 'get_product_details':
                    return $this->getProductDetails($arguments['product_id']);
                case 'add_to_cart':
                    return $this->addToCart($arguments['variant_id'], $arguments['quantity'], $sessionToken);
                case 'view_cart':
                    return $this->viewCart($sessionToken);
                case 'remove_from_cart':
                    return $this->removeFromCart($arguments['variant_id'], $sessionToken);
                case 'checkout_order':
                    return $this->checkoutOrder(
                        $arguments['shipping_name'] ?? '',
                        $arguments['shipping_phone'] ?? '',
                        $arguments['shipping_address'] ?? '',
                        $arguments['payment_method'] ?? 'cod',
                        $userId,
                        $sessionToken
                    );
                default:
                    return json_encode(['error' => "Hàm không tồn tại: $name"]);
            }
        } catch (\Exception $e) {
            Log::error("Lỗi khi thực thi tool $name", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return json_encode(['error' => "Đã xảy ra lỗi hệ thống khi gọi tool $name: " . $e->getMessage()]);
        }
    }

    private function searchProducts($keyword)
    {
        $products = Product::with('variants:id,product_id,price,weight')
            ->where('name', 'like', "%$keyword%")
            ->where('is_active', true)
            ->select('id', 'name', 'thumbnail')
            ->limit(5)
            ->get();
            
        return json_encode(['status' => 'success', 'data' => $products]);
    }

    private function searchByNeed($need)
    {
        $products = Product::with('variants:id,product_id,price,weight')
            ->where('description', 'like', "%$need%")
            ->orWhere('name', 'like', "%$need%")
            ->where('is_active', true)
            ->select('id', 'name', 'thumbnail')
            ->limit(5)
            ->get();
            
        return json_encode(['status' => 'success', 'data' => $products]);
    }

    private function getProductDetails($productId)
    {
        $product = Product::with(['variants' => function($q) {
            $q->select('id', 'product_id', 'weight', 'price', 'sku')
              ->withSum('batches as total_stock', 'stock');
        }])
        ->where('id', $productId)
        ->where('is_active', true)
        ->select('id', 'name', 'description', 'ingredient', 'usage_instruction')
        ->first();

        if (!$product) {
            return json_encode(['status' => 'error', 'message' => 'Không tìm thấy sản phẩm']);
        }

        return json_encode(['status' => 'success', 'data' => $product]);
    }

    private function getCart($sessionToken) {
        if (!$sessionToken) return [];
        return \Illuminate\Support\Facades\Cache::get("chatbot_cart_{$sessionToken}", []);
    }

    private function saveCart($sessionToken, $cart) {
        if (!$sessionToken) return;
        \Illuminate\Support\Facades\Cache::put("chatbot_cart_{$sessionToken}", $cart, now()->addDays(1));
    }

    private function addToCart($variantId, $quantity, $sessionToken) {
        if (!$sessionToken) return json_encode(['error' => 'Missing session token. Cannot use cart.']);
        
        $variant = ProductVariant::with('product')->find($variantId);
        if (!$variant) return json_encode(['error' => "Không tìm thấy biến thể sản phẩm với ID $variantId"]);
        
        $cart = $this->getCart($sessionToken);
        $found = false;
        foreach($cart as &$item) {
            if ($item['variant_id'] == $variantId) {
                $item['quantity'] += (int)$quantity;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $price = $variant->sale_price > 0 ? $variant->sale_price : $variant->price;
            $cart[] = [
                'variant_id' => (int)$variantId,
                'quantity' => (int)$quantity,
                'product_name' => $variant->product->name,
                'weight' => $variant->weight,
                'price' => $price
            ];
        }
        $this->saveCart($sessionToken, $cart);
        $total = array_reduce($cart, function($carry, $item) {
            return $carry + ($item['price'] * $item['quantity']);
        }, 0);
        
        return json_encode([
            'status' => 'success', 
            'message' => "Đã thêm $quantity x {$variant->product->name} (Gói {$variant->weight}g) vào giỏ hàng.", 
            'cart_total_amount' => $total,
            'cart' => $cart
        ]);
    }

    private function viewCart($sessionToken) {
        if (!$sessionToken) return json_encode(['error' => 'Missing session token']);
        $cart = $this->getCart($sessionToken);
        if (empty($cart)) return json_encode(['status' => 'success', 'message' => 'Giỏ hàng đang trống']);
        
        $total = array_reduce($cart, function($carry, $item) {
            return $carry + ($item['price'] * $item['quantity']);
        }, 0);
        
        return json_encode(['status' => 'success', 'cart' => $cart, 'cart_total_amount' => $total]);
    }

    private function removeFromCart($variantId, $sessionToken) {
        if (!$sessionToken) return json_encode(['error' => 'Missing session token']);
        $cart = $this->getCart($sessionToken);
        $cart = array_filter($cart, function($item) use ($variantId) {
            return $item['variant_id'] != $variantId;
        });
        $newCart = array_values($cart);
        $this->saveCart($sessionToken, $newCart);
        return json_encode(['status' => 'success', 'message' => "Đã xóa sản phẩm khỏi giỏ hàng", 'cart' => $newCart]);
    }

    private function checkoutOrder($name, $phone, $address, $paymentMethod, $userId, $sessionToken) {
        if (!$sessionToken) return json_encode(['error' => 'Missing session token']);
        
        $cart = $this->getCart($sessionToken);
        if (empty($cart)) return json_encode(['error' => 'Giỏ hàng trống, không thể đặt hàng']);
        
        if (!preg_match('/^[0-9]{10}$/', $phone)) {
            return json_encode(['error' => 'Số điện thoại không hợp lệ. Khách phải nhập đúng 10 số.']);
        }

        $items = [];
        foreach($cart as $c) {
            $items[] = [
                'variant_id' => $c['variant_id'],
                'quantity' => $c['quantity']
            ];
        }

        $request = new \Illuminate\Http\Request();
        $request->replace([
            'shipping_name' => $name,
            'shipping_phone' => $phone,
            'shipping_address' => $address,
            'payment_method' => strtolower($paymentMethod),
            'items' => $items
        ]);
        
        if ($userId) {
            $request->setUserResolver(function() use ($userId) {
                return User::find($userId);
            });
        }

        $orderController = app(\App\Http\Controllers\Api\OrderController::class);
        $response = $orderController->store($request);
        $responseData = json_decode($response->getContent(), true);

        if ($response->getStatusCode() === 201) {
            \Illuminate\Support\Facades\Cache::forget("chatbot_cart_{$sessionToken}");
            
            $orderId = $responseData['order']['id'];
            $orderCode = $responseData['order']['order_code'];
            
            if (strtolower($paymentMethod) === 'vnpay') {
                $paymentController = app(\App\Http\Controllers\Api\PaymentController::class);
                $paymentRequest = new \Illuminate\Http\Request();
                $paymentRequest->replace(['order_id' => $orderId]);
                $vnpayRes = $paymentController->createVnpayUrl($paymentRequest);
                $vnpayData = json_decode($vnpayRes->getContent(), true);
                
                if (isset($vnpayData['vnpay_url'])) {
                    return json_encode([
                        'status' => 'success',
                        'message' => 'Đã tạo đơn hàng thành công và sinh link thanh toán VNPAY',
                        'order_code' => $orderCode,
                        'vnpay_url' => $vnpayData['vnpay_url']
                    ]);
                }
            }

            return json_encode([
                'status' => 'success', 
                'message' => 'Đã tạo đơn hàng COD thành công', 
                'order_code' => $orderCode
            ]);
        }

        return json_encode(['error' => 'Lỗi khi tạo đơn hàng: ' . ($responseData['message'] ?? 'Unknown error')]);
    }
}
