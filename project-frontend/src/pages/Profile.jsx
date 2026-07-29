import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useWishlist } from '../contexts/WishlistContext';
import { getImageUrl } from '../utils';
import { useCart } from '../contexts/CartContext';

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [activeTab, setActiveTab] = useState('info'); 

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['info', 'password', 'orders', 'wishlist'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // State cho modal đăng xuất
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // State cho modal hủy đơn hàng
  const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null });

  // State cho modal sửa thông tin giao hàng
  const [shippingModal, setShippingModal] = useState({ 
    isOpen: false, 
    orderId: null, 
    shipping_name: '', 
    shipping_phone: '', 
    shipping_address: '' 
  });

  // State cho modal chi tiết đơn hàng
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Pagination for orders
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 5;

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/login';
        return;
      }

      try {
        const [userRes, orderRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/user', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch('http://127.0.0.1:8000/api/user/orders', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          const userData = data.user;
          setUser(userData);
          setFormData({
            name: userData.name || '',
            phone: userData.phone || '',
            address: userData.address || ''
          });
        } else {
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrders(orderData);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu User:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        toast.success('Cập nhật thông tin thành công!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Lỗi khi cập nhật thông tin');
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể kết nối đến máy chủ');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_new_password) {
      toast.error('Mật khẩu mới không khớp!');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setIsChangingPassword(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Đổi mật khẩu thành công!');
        setPasswordData({ current_password: '', new_password: '', confirm_new_password: '' });
      } else {
        toast.error(data.message || 'Lỗi khi đổi mật khẩu');
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể kết nối đến máy chủ');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleRetryPayment = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/payment/vnpay/create-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ order_id: orderId })
      });
      const data = await res.json();
      if (res.ok && data.vnpay_url) {
        window.location.href = data.vnpay_url;
      } else {
        toast.error('Không thể tạo lại giao dịch VNPAY.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối.');
    }
  };

  const handleUpdateShipping = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/user/orders/${shippingModal.orderId}/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          shipping_name: shippingModal.shipping_name,
          shipping_phone: shippingModal.shipping_phone,
          shipping_address: shippingModal.shipping_address,
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Cập nhật thông tin giao hàng thành công!');
        setOrders(orders.map(o => o.id === shippingModal.orderId ? data.order : o));
        setShippingModal({ isOpen: false, orderId: null, shipping_name: '', shipping_phone: '', shipping_address: '' });
      } else {
        toast.error(data.message || 'Lỗi khi cập nhật thông tin');
      }
    } catch (error) {
      toast.error('Lỗi kết nối server');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal.orderId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/user/orders/${cancelModal.orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Hủy đơn hàng thành công!');
        // Update order list
        setOrders(orders.map(o => o.id === cancelModal.orderId ? data.order : o));
      } else {
        toast.error(data.message || 'Không thể hủy đơn hàng.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối.');
    } finally {
      setCancelModal({ isOpen: false, orderId: null });
    }
  };

  const { addToCart } = useCart();

  const handleBuyAgain = (order) => {
    if (!order.items || order.items.length === 0) {
      toast.error('Đơn hàng không có sản phẩm.');
      return;
    }
    
    order.items.forEach(item => {
      if (item.variant && item.variant.product) {
        addToCart(item.variant.product, item.variant, item.quantity);
      }
    });
    
    toast.success('Đã thêm các sản phẩm vào giỏ hàng!');
    navigate('/checkout'); // Chuyển thẳng tới trang thanh toán
  };

  const confirmLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-xl font-bold text-primary">Đang tải thông tin...</div>;
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 max-w-7xl py-12 flex-grow">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* CỘT TRÁI: MENU ĐIỀU HƯỚNG */}
        <div className="bg-bglight p-6 rounded-xl h-fit">
          <div className="text-center mb-6 border-b border-gray-200 pb-6">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt="Avatar" 
                referrerPolicy="no-referrer" 
                className="w-24 h-24 rounded-full mx-auto mb-3 object-cover shadow-sm border-2 border-primary" 
              />
            ) : (
              <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center text-4xl text-primary shadow-sm mb-3">
                <i className="fas fa-user"></i>
              </div>
            )}
            
            <h2 className="text-xl font-bold text-dark">{user.name}</h2>
            <p className="text-light text-sm">{user.email}</p>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('info')}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === 'info' ? 'bg-white text-primary shadow-sm' : 'text-dark hover:bg-white hover:text-primary'
              }`}
            >
              <i className="fas fa-user w-6"></i> Thông tin cá nhân
            </button>

            <button 
              onClick={() => setActiveTab('password')}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === 'password' ? 'bg-white text-primary shadow-sm' : 'text-dark hover:bg-white hover:text-primary'
              }`}
            >
              <i className="fas fa-key w-6"></i> Đổi mật khẩu
            </button>
            
            <button 
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === 'orders' ? 'bg-white text-primary shadow-sm' : 'text-dark hover:bg-white hover:text-primary'
              }`}
            >
              <i className="fas fa-box w-6"></i> Đơn hàng của tôi
            </button>

            <button 
              onClick={() => setActiveTab('wishlist')}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === 'wishlist' ? 'bg-white text-red-500 shadow-sm' : 'text-dark hover:bg-white hover:text-red-500'
              }`}
            >
              <i className="fas fa-heart w-6"></i> Danh sách yêu thích
            </button>

            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 mt-4 text-accent hover:bg-red-50 font-semibold rounded-lg transition"
            >
              <i className="fas fa-sign-out-alt w-6"></i> Đăng xuất
            </button>
          </nav>
        </div>

        {/* CỘT PHẢI: KHU VỰC HIỂN THỊ NỘI DUNG */}
        <div className="md:col-span-3">
          
          {/* TAB: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'info' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
              <h2 className="text-2xl font-bold text-dark mb-6">Thông Tin Cá Nhân</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">Họ và Tên</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">Số Điện Thoại</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Chưa cập nhật" 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Email</label>
                  <input type="email" value={user.email} disabled className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
                  {user.google_id && (
                    <p className="text-xs text-primary mt-1 font-semibold"><i className="fab fa-google"></i> Tài khoản liên kết với Google</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Địa Chỉ Giao Hàng Mặc Định</label>
                  <textarea 
                    rows="3" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Nhập địa chỉ nhận hàng của bạn..." 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white font-semibold py-3 px-6 rounded-lg transition shadow-md cursor-pointer"
                  >
                    {isUpdating ? 'Đang cập nhật...' : 'Cập Nhật Thông Tin'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: ĐỔI MẬT KHẨU */}
          {activeTab === 'password' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
              <h2 className="text-2xl font-bold text-dark mb-6">Đổi Mật Khẩu</h2>
              {user.google_id && !user.password ? (
                <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex items-center gap-3">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>Tài khoản của bạn được liên kết bằng Google nên không có mật khẩu. Bạn không thể thực hiện chức năng này.</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">Mật Khẩu Hiện Tại</label>
                    <input 
                      type="password" 
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">Mật Khẩu Mới</label>
                    <input 
                      type="password" 
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                      required
                      minLength="6"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">Xác Nhận Mật Khẩu Mới</label>
                    <input 
                      type="password" 
                      value={passwordData.confirm_new_password}
                      onChange={(e) => setPasswordData({...passwordData, confirm_new_password: e.target.value})}
                      required
                      minLength="6"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white" 
                    />
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <button 
                      type="submit" 
                      disabled={isChangingPassword}
                      className="bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white font-semibold py-3 px-6 rounded-lg transition shadow-md cursor-pointer"
                    >
                      {isChangingPassword ? 'Đang xử lý...' : 'Xác Nhận Đổi'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB: LỊCH SỬ ĐƠN HÀNG */}
          {activeTab === 'orders' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
              <h2 className="text-2xl font-bold text-dark mb-6">Lịch Sử Đơn Hàng</h2>
              
              {orders.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-light">Bạn chưa có đơn hàng nào.</p>
                  <Link to="/products" className="inline-block mt-4 text-primary hover:underline font-semibold">
                    Mua sắm ngay
                  </Link>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                          <th className="py-4 px-4">Mã đơn</th>
                          <th className="py-4 px-4">Ngày đặt</th>
                          <th className="py-4 px-4">Tổng tiền</th>
                          <th className="py-4 px-4">Trạng thái</th>
                          <th className="py-4 px-4">Thanh toán</th>
                          <th className="py-4 px-4 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {orders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage).map((order) => {
                          let statusColor = 'bg-gray-100 text-gray-700';
                          let statusText = 'Trạng Thái Khác';
                          switch(order.order_status) {
                            case 'pending': statusColor = 'bg-yellow-100 text-yellow-700'; statusText = 'Chờ Xác Nhận'; break;
                            case 'processing': statusColor = 'bg-blue-100 text-blue-700'; statusText = 'Đang Chuẩn Bị'; break;
                            case 'shipping': statusColor = 'bg-purple-100 text-purple-700'; statusText = 'Đã Bàn Giao Vận Tải'; break;
                            case 'completed': statusColor = 'bg-green-100 text-green-700'; statusText = 'Hoàn Thành'; break;
                            case 'cancelled': statusColor = 'bg-red-100 text-red-700'; statusText = 'Đã Hủy'; break;
                            case 'returned': statusColor = 'bg-orange-100 text-orange-700'; statusText = 'Trả Hàng'; break;
                          }

                          let paymentText = 'Chưa thanh toán';
                          let paymentColor = 'text-gray-500';
                          if (order.payment_method === 'vnpay') {
                              if (order.payment_status === 'paid') { paymentText = 'VNPAY (Đã TT)'; paymentColor = 'text-green-600 font-medium'; }
                              else if (order.payment_status === 'refunded') { paymentText = 'VNPAY (Hoàn tiền)'; paymentColor = 'text-blue-600 font-medium'; }
                              else { paymentText = 'VNPAY (Chưa TT)'; paymentColor = 'text-orange-500'; }
                          } else {
                              paymentText = 'Thanh toán COD';
                              paymentColor = 'text-gray-600';
                          }

                          return (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition">
                              <td className="py-4 px-4 font-semibold text-dark">{order.order_code}</td>
                              <td className="py-4 px-4 text-gray-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                              <td className="py-4 px-4 font-bold text-primary">{Number(order.final_amount).toLocaleString('vi-VN')}₫</td>
                              <td className="py-4 px-4">
                                <span className={`${statusColor} px-2.5 py-1 rounded-full text-xs font-bold`}>{statusText}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={paymentColor}>{paymentText}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => setSelectedOrderDetails(order)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Xem chi tiết">
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  {order.order_status === 'pending' && (
                                    <button onClick={() => setCancelModal({ isOpen: true, orderId: order.id })} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hủy đơn hàng">
                                      <i className="fas fa-times"></i>
                                    </button>
                                  )}
                                  {(order.order_status === 'completed' || order.order_status === 'cancelled') && (
                                    <button onClick={() => handleBuyAgain(order)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Mua lại">
                                      <i className="fas fa-shopping-cart"></i>
                                    </button>
                                  )}
                                  {order.payment_method === 'vnpay' && order.payment_status === 'pending' && order.order_status !== 'cancelled' && (
                                    <button onClick={() => handleRetryPayment(order.id)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Thanh toán lại">
                                      <i className="fas fa-credit-card"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {Math.ceil(orders.length / ordersPerPage) > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button 
                        onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                        disabled={orderPage === 1}
                        className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
                      >
                        <i className="fas fa-chevron-left text-xs"></i>
                      </button>
                      {[...Array(Math.ceil(orders.length / ordersPerPage))].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setOrderPage(i + 1)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium transition ${orderPage === i + 1 ? 'bg-primary text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button 
                        onClick={() => setOrderPage(p => Math.min(Math.ceil(orders.length / ordersPerPage), p + 1))}
                        disabled={orderPage === Math.ceil(orders.length / ordersPerPage)}
                        className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
                      >
                        <i className="fas fa-chevron-right text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: DANH SÁCH YÊU THÍCH */}
          {activeTab === 'wishlist' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
              <h2 className="text-2xl font-bold text-dark mb-6 border-b pb-4">Danh Sách Yêu Thích</h2>
              
              {wishlistItems.length === 0 ? (
                <div className="text-center py-10 bg-bglight rounded-xl">
                  <i className="fas fa-heart-broken text-5xl text-gray-300 mb-3"></i>
                  <p className="text-gray-500 mb-4">Bạn chưa có sản phẩm nào trong danh sách yêu thích.</p>
                  <Link to="/products" className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg font-semibold transition">
                    Khám Phá Sản Phẩm
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {wishlistItems.map((product) => {
                    let minPrice = 0;
                    let maxPrice = 0;

                    if (product.variants && product.variants.length > 0) {
                      const currentPrices = product.variants.map(v => {
                        if (v.sale_price && v.sale_price > 0 && v.sale_price < v.price) {
                          return v.sale_price;
                        }
                        return v.price;
                      });
                      minPrice = Math.min(...currentPrices);
                      maxPrice = Math.max(...currentPrices);
                    }

                    return (
                      <article 
                        key={product.id} 
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition relative flex flex-col h-full"
                      >
                        <button 
                          onClick={() => removeFromWishlist(product.id)}
                          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center text-red-500 transition shadow-sm cursor-pointer"
                          title="Xóa khỏi danh sách yêu thích"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        
                        <Link to={`/product/${product.id}`} className="block relative h-48 overflow-hidden bg-bglight flex items-center justify-center group">
                          <img 
                            src={getImageUrl(product.thumbnail)} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          />
                        </Link>
                        
                        <div className="p-4 flex flex-col flex-1">
                          <Link to={`/product/${product.id}`}>
                            <h3 className="text-md font-bold mb-1 hover:text-primary transition line-clamp-1">
                              {product.name}
                            </h3>
                          </Link>
                          <div className="mt-auto border-t border-gray-50 pt-2">
                            <span className="text-md font-bold text-primary">
                              {minPrice === maxPrice || maxPrice === 0 
                                ? `${Number(minPrice).toLocaleString('vi-VN')}₫` 
                                : `${Number(minPrice).toLocaleString('vi-VN')}₫ - ${Number(maxPrice).toLocaleString('vi-VN')}₫`
                              }
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-dark mb-4">Xác nhận đăng xuất</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button 
                onClick={confirmLogout}
                className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL XÁC NHẬN HỦY ĐƠN */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-dark mb-4">Xác nhận hủy đơn hàng</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn hàng này không? Quá trình này không thể hoàn tác.
              Nếu bạn đã thanh toán qua VNPAY, tiền sẽ được hoàn tự động về tài khoản của bạn.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCancelModal({ isOpen: false, orderId: null })}
                className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Đóng
              </button>
              <button 
                onClick={handleCancelOrder}
                className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition shadow-sm"
              >
                Đồng ý hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 animate-fade-in px-4 py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-full overflow-y-auto animate-slide-up relative">
            <button 
              onClick={() => setSelectedOrderDetails(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-dark mb-1">Chi tiết đơn hàng #{selectedOrderDetails.order_code}</h3>
              <p className="text-sm text-gray-500 mb-6">Ngày đặt: {new Date(selectedOrderDetails.created_at).toLocaleDateString('vi-VN')} {new Date(selectedOrderDetails.created_at).toLocaleTimeString('vi-VN')}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Thông tin đơn hàng */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-dark mb-3"><i className="fas fa-info-circle text-primary mr-2"></i>Trạng thái</h4>
                  <p className="text-sm text-gray-600 mb-2">Đơn hàng: <span className="font-bold text-gray-800">{selectedOrderDetails.order_status === 'pending' ? 'Chờ Xác Nhận' : selectedOrderDetails.order_status === 'processing' ? 'Đang Chuẩn Bị' : selectedOrderDetails.order_status === 'shipping' ? 'Đã Bàn Giao Vận Tải' : selectedOrderDetails.order_status === 'completed' ? 'Hoàn Thành' : selectedOrderDetails.order_status === 'cancelled' ? 'Đã Hủy' : 'Trả Hàng'}</span></p>
                  <p className="text-sm text-gray-600">Thanh toán: <span className="font-bold text-gray-800">{selectedOrderDetails.payment_method === 'vnpay' ? (selectedOrderDetails.payment_status === 'paid' ? 'VNPAY (Đã Thanh Toán)' : selectedOrderDetails.payment_status === 'refunded' ? 'VNPAY (Đã Hoàn Tiền)' : 'VNPAY (Chưa TT)') : 'Thanh toán COD'}</span></p>
                </div>
                {/* Thông tin giao hàng */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 relative">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-dark"><i className="fas fa-map-marker-alt text-primary mr-2"></i>Giao hàng đến</h4>
                    {(selectedOrderDetails.order_status === 'pending' || selectedOrderDetails.order_status === 'processing') && (
                      <button 
                        onClick={() => {
                          setShippingModal({
                            isOpen: true, 
                            orderId: selectedOrderDetails.id,
                            shipping_name: selectedOrderDetails.shipping_name,
                            shipping_phone: selectedOrderDetails.shipping_phone,
                            shipping_address: selectedOrderDetails.shipping_address
                          });
                          setSelectedOrderDetails(null); // Đóng modal chi tiết để mở modal sửa
                        }}
                        className="text-primary hover:text-primary-dark transition text-xs flex items-center gap-1 font-semibold"
                      >
                        <i className="fas fa-edit"></i> Sửa
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800">{selectedOrderDetails.shipping_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedOrderDetails.shipping_phone}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedOrderDetails.shipping_address}</p>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <h4 className="font-semibold text-dark mb-3">Sản phẩm đã mua</h4>
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 mb-6">
                {selectedOrderDetails.items && selectedOrderDetails.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4">
                    <img 
                      src={getImageUrl(item.variant?.product?.thumbnail)} 
                      alt="Trà" 
                      className="w-16 h-16 object-cover rounded-md border border-gray-100" 
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-dark text-sm">{item.variant?.product?.name}</h3>
                      <p className="text-gray-500 text-xs mt-1">Phân loại: Gói {item.variant?.weight}g</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{Number(item.price).toLocaleString('vi-VN')}₫</p>
                      <p className="text-gray-500 text-xs">SL: x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <p className="font-bold text-dark text-lg">Tổng thanh toán:</p>
                <p className="text-primary text-2xl font-bold">{Number(selectedOrderDetails.final_amount).toLocaleString('vi-VN')}₫</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA THÔNG TIN GIAO HÀNG */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full animate-slide-up">
            <h3 className="text-xl font-bold text-dark mb-4">Sửa Thông Tin Giao Hàng</h3>
            <form onSubmit={handleUpdateShipping} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  value={shippingModal.shipping_name}
                  onChange={(e) => setShippingModal({...shippingModal, shipping_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  required
                  value={shippingModal.shipping_phone}
                  onChange={(e) => setShippingModal({...shippingModal, shipping_phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ giao hàng</label>
                <textarea 
                  required
                  rows="3"
                  value={shippingModal.shipping_address}
                  onChange={(e) => setShippingModal({...shippingModal, shipping_address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none"
                ></textarea>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button"
                  onClick={() => setShippingModal({ isOpen: false, orderId: null, shipping_name: '', shipping_phone: '', shipping_address: '' })} 
                  className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition font-semibold"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}