<?php

namespace App\Services;

class VNPayService
{
    protected $vnp_TmnCode;
    protected $vnp_HashSecret;
    protected $vnp_Url;
    protected $vnp_Returnurl;

    public function __construct()
    {
        $this->vnp_TmnCode = env('VNP_TMN_CODE');
        $this->vnp_HashSecret = env('VNP_HASH_SECRET');
        $this->vnp_Url = env('VNP_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
        $this->vnp_Returnurl = env('VNP_RETURN_URL');
    }

    public function createPaymentUrl($orderCode, $amount, $orderInfo = 'Thanh toan don hang')
    {
        $vnp_TxnRef = $orderCode;
        $vnp_OrderInfo = $orderInfo;
        $vnp_OrderType = 'billpayment';
        $vnp_Amount = $amount * 100;
        $vnp_Locale = 'vn';
        $vnp_BankCode = '';
        $vnp_IpAddr = request()->ip();

        $inputData = array(
            "vnp_Version" => "2.1.0",
            "vnp_TmnCode" => $this->vnp_TmnCode,
            "vnp_Amount" => $vnp_Amount,
            "vnp_Command" => "pay",
            "vnp_CreateDate" => date('YmdHis'),
            "vnp_CurrCode" => "VND",
            "vnp_IpAddr" => $vnp_IpAddr,
            "vnp_Locale" => $vnp_Locale,
            "vnp_OrderInfo" => $vnp_OrderInfo,
            "vnp_OrderType" => $vnp_OrderType,
            "vnp_ReturnUrl" => $this->vnp_Returnurl,
            "vnp_TxnRef" => $vnp_TxnRef
        );

        if (isset($vnp_BankCode) && $vnp_BankCode != "") {
            $inputData['vnp_BankCode'] = $vnp_BankCode;
        }

        ksort($inputData);
        $query = "";
        $i = 0;
        $hashdata = "";
        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashdata .= urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
            $query .= urlencode($key) . "=" . urlencode($value) . '&';
        }

        $vnp_Url = $this->vnp_Url . "?" . $query;
        if (isset($this->vnp_HashSecret)) {
            $vnpSecureHash = hash_hmac('sha512', $hashdata, $this->vnp_HashSecret);
            $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;
        }

        return $vnp_Url;
    }

    public function verifyPayment($inputData)
    {
        $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
        
        $vnpayData = [];
        foreach ($inputData as $key => $value) {
            if (substr($key, 0, 4) == "vnp_") {
                $vnpayData[$key] = $value;
            }
        }
        
        unset($vnpayData['vnp_SecureHash']);
        unset($vnpayData['vnp_SecureHashType']);

        ksort($vnpayData);
        $i = 0;
        $hashData = "";
        foreach ($vnpayData as $key => $value) {
            if ($i == 1) {
                $hashData = $hashData . '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData = $hashData . urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
        }

        $secureHash = hash_hmac('sha512', $hashData, $this->vnp_HashSecret);

        if (hash_equals(strtolower($secureHash), strtolower($vnp_SecureHash))) {
            if ($vnpayData['vnp_ResponseCode'] == '00') {
                return ['success' => true, 'message' => 'Giao dịch thành công', 'orderCode' => $vnpayData['vnp_TxnRef']];
            }
            return ['success' => false, 'message' => 'Giao dịch không thành công hoặc bị hủy'];
        }
        
        return ['success' => false, 'message' => 'Chữ ký không hợp lệ'];
    }

    public function refund($orderCode, $amount, $transDate, $user = 'Admin')
    {
        $vnp_Api = env('VNP_API_URL', 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction');
        $vnp_RequestId = time() . rand(100, 999);
        $vnp_Version = '2.1.0';
        $vnp_Command = 'refund';
        $vnp_TransactionType = '02'; 
        $vnp_TxnRef = $orderCode;
        $vnp_Amount = $amount * 100;
        $vnp_OrderInfo = "Hoan tien don hang " . $orderCode;
        $vnp_TransactionNo = "0"; 
        $vnp_TransactionDate = date('YmdHis', strtotime($transDate));
        $vnp_CreateBy = $user;
        $vnp_CreateDate = date('YmdHis');
        $vnp_IpAddr = request()->ip() ?? '127.0.0.1';

        $datamac = $vnp_RequestId . "|" . $vnp_Version . "|" . $vnp_Command . "|" . $this->vnp_TmnCode . "|" . $vnp_TransactionType . "|" . $vnp_TxnRef . "|" . $vnp_Amount . "|" . $vnp_TransactionNo . "|" . $vnp_TransactionDate . "|" . $vnp_CreateBy . "|" . $vnp_CreateDate . "|" . $vnp_IpAddr . "|" . $vnp_OrderInfo;
        $vnp_SecureHash = hash_hmac('sha512', $datamac, $this->vnp_HashSecret);

        $data = [
            "vnp_RequestId" => $vnp_RequestId,
            "vnp_Version" => $vnp_Version,
            "vnp_Command" => $vnp_Command,
            "vnp_TmnCode" => $this->vnp_TmnCode,
            "vnp_TransactionType" => $vnp_TransactionType,
            "vnp_TxnRef" => $vnp_TxnRef,
            "vnp_Amount" => $vnp_Amount,
            "vnp_OrderInfo" => $vnp_OrderInfo,
            "vnp_TransactionNo" => $vnp_TransactionNo,
            "vnp_TransactionDate" => $vnp_TransactionDate,
            "vnp_CreateBy" => $vnp_CreateBy,
            "vnp_CreateDate" => $vnp_CreateDate,
            "vnp_IpAddr" => $vnp_IpAddr,
            "vnp_SecureHash" => $vnp_SecureHash
        ];

        try {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->post($vnp_Api, $data);
            $result = $response->json();
            
            \Log::info("VNPay Refund Response: ", $result ?? []);

            if (isset($result['vnp_ResponseCode']) && $result['vnp_ResponseCode'] == '00') {
                return ['success' => true, 'message' => 'Hoàn tiền thành công'];
            }
            
            \Illuminate\Support\Facades\Log::warning("VNPAY từ chối hoàn tiền: ", $result ?? []);
            return ['success' => false, 'message' => 'Giao dịch chưa đủ điều kiện hoàn tiền (thường do chưa qua 24h đối soát).'];
        
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("VNPay Refund Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Lỗi kết nối VNPay: ' . $e->getMessage()];
        }
    }
}
