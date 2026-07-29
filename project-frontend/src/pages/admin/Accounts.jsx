import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/admin/ConfirmModal';

export default function Accounts() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rolesList, setRolesList] = useState([]);
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  
  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('edit'); // 'create' | 'edit'
  const [step, setStep] = useState(1); // 1: Edit form, 2: Confirm
  
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, user: null, message: '' });
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff'
  });

  const { isAdmin, user: currentUser } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async (page = currentPage, search = debouncedSearch) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/accounts?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`, {
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data);
        setCurrentPage(data.current_page);
        setTotalPages(data.last_page);
      } else {
        toast.error('Lỗi khi tải dữ liệu từ máy chủ.');
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchTerm) {
        setDebouncedSearch(searchTerm);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    // Fetch dynamic roles
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/admin/roles`, {
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setRolesList(await res.json());
        }
      } catch (error) {
        console.error('Lỗi tải danh sách vai trò', error);
      }
    };
    fetchRoles();
  }, []);

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'staff' // Default to staff for internal
    });
    setStep(1);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (user) => {
    setDrawerMode('edit');
    setSelectedUser(user);
    const currentRole = user.roles && user.roles.length > 0 ? user.roles[0].name : 'customer';
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '', 
      role: currentRole
    });
    setStep(1);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tên không được để trống!');
      return;
    }
    if (drawerMode === 'create' && (!formData.email.trim() || !formData.password)) {
      toast.error('Email và mật khẩu không được để trống khi tạo mới!');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    setStep(2);
  };

  const handleSaveAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role
      };
      
      if (drawerMode === 'create') {
        payload.email = formData.email;
        payload.password = formData.password;
      } else if (formData.password) {
        payload.password = formData.password;
      }

      const url = drawerMode === 'create' 
        ? `${API_URL}/api/admin/accounts`
        : `${API_URL}/api/admin/accounts/${selectedUser.id}`;
      
      const method = drawerMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(drawerMode === 'create' ? 'Tạo tài khoản thành công!' : 'Cập nhật tài khoản thành công!');
        setIsDrawerOpen(false);
        fetchData(currentPage);
      } else {
        const errorData = await res.json();
        let errorMessage = errorData.message || (drawerMode === 'create' ? 'Tạo tài khoản thất bại.' : 'Cập nhật thất bại.');
        if (errorData.errors) {
          const firstErrorKey = Object.keys(errorData.errors)[0];
          errorMessage = errorData.errors[firstErrorKey][0];
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi kết nối máy chủ!');
    }
  };

  const handleToggleStatus = (user) => {
    const newStatus = !user.is_active;
    const actionText = newStatus ? 'mở khóa' : 'khóa';
    setConfirmModal({
      isOpen: true,
      user,
      message: `Bạn có chắc chắn muốn ${actionText} tài khoản của ${user.name}?`
    });
    setOpenMenuId(null);
  };

  const executeToggleStatus = async () => {
    const user = confirmModal.user;
    setConfirmModal({ isOpen: false, user: null, message: '' });
    if (!user) return;
    const newStatus = !user.is_active;
    const actionText = newStatus ? 'mở khóa' : 'khóa';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/accounts/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (res.ok) {
        toast.success(`Đã ${actionText} tài khoản thành công!`);
        fetchData(currentPage);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || `Lỗi khi ${actionText}.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi kết nối máy chủ!');
    }
  };

  const renderRoleBadge = (roleName) => {
    switch (roleName) {
      case 'admin':
        return <span className="bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Admin</span>;
      case 'staff':
        return <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Kho (Staff)</span>;
      case 'sales':
        return <span className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Bán hàng (Sales)</span>;
      case 'customer':
        return <span className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Khách hàng</span>;
      default:
        const roleObj = rolesList.find(r => r.name === roleName);
        const displayName = roleObj ? roleObj.name.toUpperCase() : (roleName ? roleName.toUpperCase() : 'Khách hàng');
        return <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{displayName}</span>;
    }
  };

  const roleNames = {
    'admin': 'Quản trị viên (Admin)',
    'staff': 'Nhân viên Kho (Staff)',
    'sales': 'Nhân viên Bán hàng (Sales)',
    'customer': 'Khách hàng (Customer)'
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Tài Khoản</h2>
            <p className="text-gray-500 text-sm mt-1">Quản lý người dùng, phân quyền và trạng thái</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm theo Tên, Email, SĐT..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <button 
              onClick={openCreateDrawer}
              className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <i className="fas fa-plus"></i>
              <span className="hidden sm:inline">Tạo tài khoản nội bộ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Dữ Liệu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && users.length === 0 ? (
          <div className="absolute inset-0 flex justify-center items-center bg-white/80 z-10 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                <span className="text-gray-500 font-medium">Đang tải dữ liệu...</span>
             </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-bold text-center w-16">ID</th>
                <th className="p-4 font-bold">Người Dùng</th>
                <th className="p-4 font-bold">Liên Hệ</th>
                <th className="p-4 font-bold text-center">Vai Trò</th>
                <th className="p-4 font-bold text-center">Trạng Thái</th>
                {isAdmin && <th className="p-4 font-bold text-center w-20">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-users-slash text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Không tìm thấy người dùng nào</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(user => {
                const roleName = user.roles && user.roles.length > 0 ? user.roles[0].name : 'customer';
                const isCurrentUser = currentUser?.id === user.id;

                return (
                  <tr key={user.id} className={`hover:bg-blue-50/30 transition-colors group ${isCurrentUser ? 'bg-blue-50/10' : ''}`}>
                    <td className="p-4 text-center font-medium text-gray-500 text-sm">#{user.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {user.name} 
                            {isCurrentUser && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">BẠN</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <i className="fas fa-phone-alt text-gray-400"></i> {user.phone || 'Chưa có'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {renderRoleBadge(roleName)}
                    </td>
                    <td className="p-4 text-center">
                      {user.is_active ? (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Hoạt động
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                          <i className="fas fa-lock"></i> Đã khóa
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-center relative">
                        {isCurrentUser ? (
                          <span className="text-gray-400 text-xs italic block text-center">Không áp dụng</span>
                        ) : (
                          <>
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                              className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                            >
                              <i className="fas fa-ellipsis-v"></i>
                            </button>

                            {/* Action Dropdown Menu */}
                            {openMenuId === user.id && (
                              <div ref={menuRef} className="absolute right-12 top-8 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left">
                                <button 
                                  onClick={() => openEditDrawer(user)}
                                  className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 font-medium transition-colors"
                                >
                                  <i className="fas fa-user-edit w-4"></i> Phân quyền / Sửa
                                </button>
                                
                                <div className="border-t border-gray-100">
                                  <button 
                                    onClick={() => handleToggleStatus(user)} 
                                    className={`w-full px-4 py-2.5 text-sm ${user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'} text-left flex items-center gap-3 font-medium transition-colors`}
                                  >
                                    <i className={`fas ${user.is_active ? 'fa-lock' : 'fa-unlock'} w-4`}></i> 
                                    {user.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination currentPage={currentPage} lastPage={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* SLIDE-OVER DRAWER FOR EDIT / CONFIRM */}
      {isDrawerOpen && (selectedUser || drawerMode === 'create') && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-user-cog text-primary"></i> 
                  {step === 1 
                    ? (drawerMode === 'create' ? 'Tạo Tài Khoản Nội Bộ' : 'Chỉnh Sửa Tài Khoản') 
                    : 'Xác Nhận Thay Đổi'}
                </h3>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              {step === 1 ? (
                <form id="accountForm" onSubmit={handleProceedToConfirm} className="space-y-5">
                  {drawerMode === 'edit' && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
                      <i className="fas fa-info-circle mt-0.5"></i>
                      <div>
                        <p>Đang chỉnh sửa: <strong>{selectedUser?.email}</strong></p>
                        <p className="text-blue-600 mt-1">Vai trò hiện tại: {selectedUser?.roles?.[0]?.name || 'customer'}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Thông tin cơ bản</h4>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
                      <input type="text" name="name" required value={formData.name} onChange={handleInputChange} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" />
                    </div>
                    {drawerMode === 'create' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Đăng Nhập <span className="text-red-500">*</span></label>
                        <input type="email" name="email" required value={formData.email} onChange={handleInputChange} 
                          className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Số điện thoại</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-blue-600 border-b border-gray-100 pb-2 flex items-center gap-2">
                      <i className="fas fa-user-shield"></i> Phân quyền
                    </h4>
                    <div>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={drawerMode === 'edit' && selectedUser?.roles?.[0]?.name === 'customer'}
                        className={`w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-gray-800 ${drawerMode === 'edit' && selectedUser?.roles?.[0]?.name === 'customer' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                      >
                        {rolesList.map(r => {
                          if (drawerMode === 'create' && r.name === 'customer') return null; // Không cho tạo customer
                          return <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                        })}
                        {rolesList.length === 0 && (
                          <>
                            <option value="admin">Quản trị viên (Admin)</option>
                            <option value="staff">Nhân viên Kho (Staff)</option>
                            <option value="sales">Nhân viên Bán hàng (Sales)</option>
                            {drawerMode !== 'create' && <option value="customer">Khách hàng (Customer)</option>}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h4 className="font-bold text-red-600 border-b border-gray-100 pb-2 flex items-center gap-2">
                      <i className="fas fa-key"></i> {drawerMode === 'create' ? 'Mật khẩu truy cập' : 'Đặt lại mật khẩu'}
                    </h4>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        {drawerMode === 'create' ? 'Tạo mật khẩu cho tài khoản nội bộ (ít nhất 6 ký tự).' : 'Chỉ nhập khi bạn muốn thay đổi mật khẩu của người này.'}
                      </p>
                      <input 
                        type="password" 
                        name="password" 
                        required={drawerMode === 'create'}
                        placeholder={drawerMode === 'create' ? 'Nhập mật khẩu...' : 'Để trống nếu không đổi...'}
                        value={formData.password} 
                        onChange={handleInputChange} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors text-sm" 
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 text-amber-600 mb-4 font-bold text-lg">
                      <i className="fas fa-exclamation-triangle text-2xl"></i> Cảnh báo thay đổi
                    </div>
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      {drawerMode === 'create' 
                        ? <>Bạn đang tạo tài khoản nội bộ mới cho <span className="font-bold">{formData.name}</span>. Vui lòng kiểm tra kỹ trước khi xác nhận.</>
                        : <>Bạn đang thay đổi thông tin của người dùng <span className="font-bold">{selectedUser?.name}</span>. Vui lòng kiểm tra kỹ trước khi xác nhận.</>
                      }
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 space-y-3 border border-amber-100">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                        <span className="text-gray-500 text-sm">Vai trò {drawerMode === 'create' ? 'được cấp' : 'mới'}</span>
                        <span className="font-bold text-dark">{rolesList.find(r => r.name === formData.role)?.name?.toUpperCase() || roleNames[formData.role] || formData.role}</span>
                      </div>
                      {formData.password && (
                        <div className="flex justify-between items-center text-red-600 font-bold">
                          <span className="text-sm"><i className="fas fa-lock mr-1"></i> Mật khẩu</span>
                          <span>Đã bị thay đổi</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              {step === 1 ? (
                <>
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Hủy bỏ
                  </button>
                  <button form="accountForm" type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95">
                    Tiếp tục <i className="fas fa-arrow-right"></i>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Quay lại
                  </button>
                  <button type="button" onClick={handleSaveAccount} className="px-8 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md shadow-red-500/30 flex items-center gap-2 transition-all active:scale-95">
                    <i className="fas fa-check"></i> {drawerMode === 'create' ? 'Tạo Tài Khoản' : 'Lưu Thay Đổi'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, user: null, message: '' })}
        onConfirm={executeToggleStatus}
        message={confirmModal.message}
      />
    </div>
  );
}
