import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils';

export default function AdminProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'password'
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const token = getAuthToken();
      const res = await fetch('http://127.0.0.1:8000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        toast.success('Cập nhật thông tin cá nhân thành công!');
        onClose();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Lỗi khi cập nhật thông tin');
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi kết nối đến máy chủ');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      return toast.error('Mật khẩu xác nhận không khớp');
    }
    
    setIsUpdating(true);
    try {
      const token = getAuthToken();
      const res = await fetch('http://127.0.0.1:8000/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });
      
      if (res.ok) {
        toast.success('Đổi mật khẩu thành công!');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        onClose();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Lỗi khi đổi mật khẩu');
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi kết nối đến máy chủ');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Quản lý Tài Khoản</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><i className="fas fa-times text-xl"></i></button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 font-semibold text-sm transition ${activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Thông tin cá nhân
          </button>
          <button 
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 font-semibold text-sm transition ${activeTab === 'password' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Đổi mật khẩu
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'info' ? (
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số Điện Thoại</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Địa Chỉ</label>
                <textarea 
                  rows="3" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                ></textarea>
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-70"
                >
                  {isUpdating ? 'Đang lưu...' : 'Lưu Thông Tin'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {user?.google_id && !user?.password ? (
                <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                  Tài khoản của bạn được liên kết qua Google nên không cần sử dụng mật khẩu.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                    <input 
                      type="password" 
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                    <input 
                      type="password" 
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                    <input 
                      type="password" 
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition" 
                    />
                  </div>
                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-70"
                    >
                      {isUpdating ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
