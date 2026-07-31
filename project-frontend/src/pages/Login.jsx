import { toast } from 'react-toastify';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();

  // Hàm điều hướng theo role sau khi đăng nhập thành công
  const redirectByRole = (roles, userName) => {
    localStorage.setItem('welcomeMessage', `Đăng nhập thành công! Xin chào ${userName}`);
    
    // Nếu có trang cũ cần quay lại (VD: trang Thanh toán)
    if (location.state?.returnTo) {
      window.location.href = location.state.returnTo;
      return;
    }

    if (roles.includes('admin') || roles.includes('sales')) {
      window.location.href = '/admin'; // Admin/Sales → Admin Panel
    } else if (roles.includes('staff')) {
      window.location.href = '/admin/inventory'; // Staff → Quản lý Nhập kho
    } else {
      window.location.href = '/'; // Customer → Cửa hàng
    }
  };

  // 1. Hàm Đăng nhập bằng Google
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ access_token: tokenResponse.access_token })
        });

        const data = await res.json();

        if (res.ok) {
          const roles = data.roles || [];
          login(data.access_token, data.user, roles);
          redirectByRole(roles, data.user.name);
        } else {
          toast.error('Lỗi đăng nhập: ' + data.message);
        }
      } catch (error) {
        console.error(error);
        toast.error('Không thể kết nối đến máy chủ Laravel!');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      alert('Đăng nhập Google thất bại!');
    }
  });

  // 2. Hàm Đăng nhập tài khoản thường
  const handleNormalSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await res.json();

      if (res.ok) {
        const roles = data.roles || [];
        login(data.access_token, data.user, roles);
        redirectByRole(roles, data.user.name);
      } else {
        toast.error('Lỗi đăng nhập: ' + data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể kết nối đến máy chủ Laravel!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-bglight py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark mb-2">Đăng Nhập</h2>
          <p className="text-light text-sm">Chào mừng bạn quay trở lại với CK Tea</p>
        </div>

        <form onSubmit={handleNormalSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
              placeholder="Nhập email của bạn"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-dark">Mật khẩu</label>
              <a href="#" className="text-sm text-primary hover:text-primary-dark transition">Quên mật khẩu?</a>
            </div>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition shadow-md cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        {/* Nút đăng nhập Google */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
            </div>
          </div>

          <button 
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="mt-6 w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-dark font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition shadow-sm cursor-pointer"
          >
            <img src="/img/GG logo.jpg" alt="Google" className="w-5 h-5" />
            {isLoading ? 'Đang kết nối...' : 'Đăng nhập bằng Google'}
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-light">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-dark transition">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}