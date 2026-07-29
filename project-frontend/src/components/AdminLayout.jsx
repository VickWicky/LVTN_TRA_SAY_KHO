import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import echo from '../utils/echo';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../contexts/AuthContext';
import AdminProfileModal from './admin/AdminProfileModal';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, logout, isAdmin, isStaff, isSales, hasAccountAccess } = useAuth();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    console.log('✅ Đang kết nối Reverb...');

    const channel = echo.channel('admin-notifications');

    channel.listen('OrderCreated', (data) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => {
        if (prev.some(n => n.order_id === data.order_id && n.message === `Đơn hàng mới từ: ${data.customer_name}`)) return prev;
        return [data, ...prev];
      });
      
      window.dispatchEvent(new CustomEvent('refreshData'));

      toast.success(`🛒 Có đơn hàng mới từ: ${data.customer_name} (${new Intl.NumberFormat('vi-VN').format(data.total_amount)} ₫)`, {
        toastId: `order-created-${data.order_id}`
      });
    });

    channel.listen('OrderUpdated', (data) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => {
        if (prev.some(n => n.order_id === data.order_id && n.message === data.message)) return prev;
        return [data, ...prev];
      });
      
      window.dispatchEvent(new CustomEvent('refreshData'));

      toast.info(`📝 ${data.message}`, {
        toastId: `order-updated-${data.order_id}`
      });
    });

    channel.listen('ContactCreated', (data) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => {
        if (prev.some(n => n.contact_id === data.contact_id && n.message === data.message)) return prev;
        return [data, ...prev];
      });
      
      window.dispatchEvent(new CustomEvent('refreshData'));

      toast.info(`✉️ ${data.message}`, {
        toastId: `contact-created-${data.contact_id}`
      });
    });

    return () => {
      channel.stopListening('OrderCreated');
      channel.stopListening('OrderUpdated');
      channel.stopListening('ContactCreated');
      echo.leaveChannel('admin-notifications');
    };
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    logout(); // Xóa token + reset state qua AuthContext
    window.location.href = '/login';
  };

  // Lấy role label hiển thị
  const getRoleBadge = () => {
    if (roles.includes('admin')) return { label: 'Admin', color: 'bg-red-500' };
    if (roles.includes('staff')) return { label: 'Nhân viên', color: 'bg-blue-500' };
    return { label: 'User', color: 'bg-gray-500' };
  };

  const roleBadge = getRoleBadge();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: 'fas fa-chart-line', show: isAdmin || isSales }, // Không cho kho xem
    { path: '/admin/categories', label: 'Quản lý Danh mục', icon: 'fas fa-tags', show: isAdmin || isSales }, // Bán hàng được xem, kho thì không cần
    { path: '/admin/products', label: 'Quản lý Sản phẩm', icon: 'fas fa-box-open', show: true }, // Mọi người đều thấy (Sales/Staff chỉ xem)
    { path: '/admin/promotions', label: 'Quản lý Khuyến mãi', icon: 'fas fa-gift', show: isAdmin },
    { path: '/admin/orders', label: 'Quản lý Đơn hàng', icon: 'fas fa-shopping-cart', show: isAdmin || isSales },
    { path: '/admin/inventory-logs', label: 'Quản lý Xuất kho', icon: 'fas fa-file-export', show: isAdmin || isStaff },
    { path: '/admin/inventory', label: 'Quản lý Nhập kho', icon: 'fas fa-warehouse', show: isAdmin || isStaff }, // Chỉ Admin & Kho
    { path: '/admin/suppliers', label: 'Nhà Cung Cấp', icon: 'fas fa-truck', show: isAdmin || isStaff }, // Chỉ Admin & Kho
    { path: '/admin/contacts', label: 'Quản lý Liên hệ', icon: 'fas fa-envelope', show: isAdmin || isSales },
    { path: '/admin/accounts', label: 'Quản lý Tài khoản', icon: 'fas fa-users', show: hasAccountAccess },
    { path: '/admin/roles', label: 'Quản lý Vai trò', icon: 'fas fa-user-shield', show: isAdmin },
    { path: '/admin/banners', label: 'Quản lý Banner', icon: 'fas fa-images', show: isAdmin },
    { path: '/admin/settings', label: 'Cấu hình Website', icon: 'fas fa-cogs', show: isAdmin },
  ].filter(item => item.show);

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-dark text-white flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <i className="fas fa-leaf text-primary text-2xl"></i>
          <span className="text-xl font-bold tracking-wider">CK TEA <span className="text-primary text-sm">ADMIN</span></span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path + '/'));
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-white shadow-md font-semibold' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <i className={`${item.icon} w-5 text-center`}></i>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm mb-2"
          >
            <i className="fas fa-external-link-alt w-5 text-center"></i> Về trang Cửa hàng
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-sm font-semibold"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col relative">
        <ToastContainer />
        <header className="bg-white h-16 shadow-sm border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">
            {navItems.find(i => location.pathname === i.path || (i.path !== '/admin' && location.pathname.startsWith(i.path + '/')))?.label || 'Admin Panel'}
          </h1>
          
          <div className="flex items-center gap-4 relative">
            <button 
              className="text-gray-500 hover:text-primary transition-colors relative"
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                if (!isNotificationOpen) setUnreadCount(0);
              }}
            >
              <i className="far fa-bell text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Thông báo */}
            {isNotificationOpen && (
              <div className="absolute top-10 right-10 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-800">Thông báo mới</h3>
                  <button onClick={() => setNotifications([])} className="text-xs text-primary hover:underline">Xóa tất cả</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      Không có thông báo nào.
                    </div>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div key={idx} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
                        <p className="text-sm font-semibold text-gray-800 mb-1">{notif.message}</p>
                        {notif.customer_name && (
                          <p className="text-xs text-gray-600 mb-1">Khách: {notif.customer_name}</p>
                        )}
                        {notif.total_amount !== undefined && (
                          <p className="text-xs text-red-500 font-bold">{new Intl.NumberFormat('vi-VN').format(notif.total_amount)} ₫</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* User info + Role badge */}
            <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition cursor-pointer border-none outline-none">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name || 'Admin'}</p>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${roleBadge.color} mt-0.5`}>
                  {roleBadge.label}
                </span>
              </div>
              <div className="h-9 w-9 bg-primary rounded-full flex items-center justify-center text-white shadow-sm border-2 border-white">
                <i className="fas fa-user-shield text-sm"></i>
              </div>
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Xác nhận đăng xuất</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn đăng xuất khỏi trang Quản trị không?</p>
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

      {/* MODAL THÔNG TIN TÀI KHOẢN */}
      <AdminProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
}
