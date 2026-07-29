import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

export default function PaymentReturn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, failed
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const searchParams = new URLSearchParams(location.search);
      if (!searchParams.has('vnp_SecureHash')) {
        setStatus('failed');
        setMessage('Không tìm thấy thông tin thanh toán.');
        return;
      }

      // Chuyển searchParams thành object
      const data = {};
      for (const [key, value] of searchParams.entries()) {
        data[key] = value;
      }

      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('http://127.0.0.1:8000/api/payment/vnpay/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          setStatus('success');
          setMessage(result.message || 'Thanh toán thành công!');
        } else {
          setStatus('failed');
          setMessage(result.message || 'Thanh toán bị lỗi hoặc đã hủy.');
        }
      } catch (err) {
        console.error(err);
        setStatus('failed');
        setMessage('Lỗi kết nối đến máy chủ.');
      }
    };

    verifyPayment();
  }, [location]);

  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      {status === 'processing' && (
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin text-5xl text-primary mb-4"></i>
          <h2 className="text-2xl font-bold text-dark">Đang xử lý thanh toán...</h2>
          <p className="text-gray-500 mt-2">Vui lòng không đóng trình duyệt lúc này.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-4xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-dark mb-2">Thanh toán thành công!</h2>
          
          {localStorage.getItem('token') ? (
            <>
              <p className="text-gray-600 mb-8">{message}</p>
              <div className="flex gap-4 justify-center">
                <Link to="/" className="px-6 py-2 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary-light/10 transition">
                  Về Trang Chủ
                </Link>
                <Link to="/profile?tab=orders" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition">
                  Xem Đơn Hàng
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-8">Nhân viên sẽ liên hệ với bạn sớm nhất có thể để xác nhận thông tin giao hàng.</p>
              <div className="flex gap-4 justify-center">
                <Link to="/" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition">
                  Về Trang Chủ
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-times text-4xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-dark mb-2">Thanh toán thất bại</h2>
          <p className="text-gray-600 mb-8">{message}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={async () => {
                const searchParams = new URLSearchParams(location.search);
                const orderCode = searchParams.get('vnp_TxnRef');
                if (orderCode) {
                  try {
                    const token = localStorage.getItem('token');
                    const headers = {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch('http://127.0.0.1:8000/api/payment/vnpay/create-url', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({ order_code: orderCode })
                    });
                    const data = await res.json();
                    if (res.ok && data.vnpay_url) {
                      window.location.href = data.vnpay_url;
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
              className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition"
            >
              Thử thanh toán lại
            </button>
            {localStorage.getItem('token') ? (
              <Link to="/profile?tab=orders" className="w-full px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-lg transition font-medium">
                Về Trang Quản Lý Đơn
              </Link>
            ) : (
              <Link to="/" className="w-full px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-lg transition font-medium">
                Về Trang Chủ
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
