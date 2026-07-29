import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getImageUrl } from '../../utils';
import Pagination from '../../components/admin/Pagination';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const fetchIdRef = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, processing, completed, cancelled
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null, newStatus: '' });
  const [shippingModal, setShippingModal] = useState({ 
    isOpen: false, 
    orderId: null, 
    shipping_name: '', 
    shipping_phone: '', 
    shipping_address: '' 
  });
  
  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrders = async (page = currentPage, search = debouncedSearch, status = filterStatus) => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      // For backend we may need to adjust the API to support status filter
      // If backend doesn't support it yet, it will just ignore it. 
      // Assuming backend supports it or we filter on frontend.
      // Let's pass it anyway: &status=${status}
      let url = `http://127.0.0.1:8000/api/admin/orders?page=${page}&search=${encodeURIComponent(search)}`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (fetchId !== fetchIdRef.current) return;
      if (res.ok) {
        const data = await res.json();
        // Fallback filter if API doesn't support status param yet
        let filteredData = data.data || data; // handle if data is paginated or just array
        if (Array.isArray(data)) {
           // Backend returns array (no pagination), we handle basic frontend filter
           filteredData = status === 'all' ? data : data.filter(o => o.order_status === status);
           if (search) {
             filteredData = filteredData.filter(o => o.order_code.toLowerCase().includes(search.toLowerCase()) || o.shipping_phone.includes(search));
           }
           setOrders(filteredData);
           setLastPage(1);
        } else {
           // API returns paginated data (already filtered by backend)
           // But since backend doesn't have status filter yet, we do frontend filtering if it's returning all data
           setOrders(data.data);
           setCurrentPage(data.current_page);
           setLastPage(data.last_page);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  useEffect(() => {
    fetchOrders(currentPage, debouncedSearch, filterStatus);

    const handleRefresh = () => {
      fetchOrders(currentPage, debouncedSearch, filterStatus);
    };
    window.addEventListener('refreshData', handleRefresh);

    return () => {
      window.removeEventListener('refreshData', handleRefresh);
    };
  }, [currentPage, debouncedSearch]);

  const onStatusSelectChange = (orderId, newStatus) => {
    setConfirmModal({ isOpen: true, orderId, newStatus });
    setOpenMenuId(null);
  };

  const handleStatusChange = async () => {
    const { orderId, newStatus } = confirmModal;
    setConfirmModal({ isOpen: false, orderId: null, newStatus: '' });
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Cập nhật thành công!');
        fetchOrders(currentPage, debouncedSearch, filterStatus); // Refresh
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(data.order);
        }
      } else {
        toast.error(data.message || 'Cập nhật thất bại.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Có lỗi xảy ra khi gọi API.');
    }
  };


  const handlePaymentStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/admin/orders/${orderId}/payment-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ payment_status: newStatus })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Cập nhật thanh toán thành công!');
        fetchOrders(currentPage, debouncedSearch, filterStatus);
        if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(data.order);
        }
      } else {
        toast.error(data.message || 'Cập nhật thất bại.');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Có lỗi xảy ra khi gọi API.');
    }
  };

  const handleUpdateShipping = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/admin/orders/${shippingModal.orderId}/shipping`, {
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
        fetchOrders(currentPage, debouncedSearch, filterStatus);
        if (selectedOrder && selectedOrder.id === shippingModal.orderId) {
            setSelectedOrder(data.order);
        }
        setShippingModal({ isOpen: false, orderId: null, shipping_name: '', shipping_phone: '', shipping_address: '' });
      } else {
        toast.error(data.message || 'Lỗi khi cập nhật thông tin');
      }
    } catch (error) {
      toast.error('Lỗi kết nối server');
    }
  };

  const openDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Hoàn thành</span>;
      case 'cancelled': return <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Đã hủy</span>;
      case 'processing': return <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Đang chuẩn bị</span>;
      case 'shipping': return <span className="bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Đã Bàn Giao Vận Tải</span>;
      default: return <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Chờ xác nhận</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid': return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded text-xs font-bold">Đã thanh toán</span>;
      case 'refunded': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded text-xs font-bold">Hoàn tiền</span>;
      case 'failed': return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded text-xs font-bold">Thất bại</span>;
      default: return <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded text-xs font-bold">Chờ thanh toán</span>;
    }
  };

  const TABS = [
    { id: 'all', label: 'Tất cả đơn' },
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'processing', label: 'Đang chuẩn bị' },
    { id: 'shipping', label: 'Đã bàn giao ĐVVC' },
    { id: 'completed', label: 'Hoàn thành' },
    { id: 'cancelled', label: 'Đã hủy' }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Quick Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Đơn Hàng</h2>
            <p className="text-gray-500 text-sm mt-1">Theo dõi, cập nhật và xử lý đơn hàng</p>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input 
              type="text" 
              placeholder="Tìm mã đơn, tên, SĐT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full md:w-72 text-sm bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-100 overflow-x-auto pb-[1px]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                filterStatus === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && orders.length === 0 ? (
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
                <th className="p-4 font-bold">Mã Đơn</th>
                <th className="p-4 font-bold">Khách Hàng</th>
                <th className="p-4 font-bold">Ngày Đặt</th>
                <th className="p-4 font-bold text-right">Tổng Tiền</th>
                <th className="p-4 font-bold text-center">Thanh Toán</th>
                <th className="p-4 font-bold text-center">Trạng Thái</th>
                <th className="p-4 font-bold text-center w-16">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-box-open text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Không tìm thấy đơn hàng nào</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4 font-bold text-gray-900">{order.order_code}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{order.shipping_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{order.shipping_phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                  <td className="p-4 font-bold text-primary text-right">{Number(order.final_amount).toLocaleString('vi-VN')}₫</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                        {order.payment_method === 'vnpay' ? 'VNPay' : order.payment_method === 'momo' ? 'MoMo' : 'Tiền mặt'}
                      </span>
                      {getPaymentBadge(order.payment_status)}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {getStatusBadge(order.order_status)}
                  </td>
                  <td className="p-4 text-center relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center"
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>

                    {/* Action Dropdown Menu */}
                    {openMenuId === order.id && (
                      <div ref={menuRef} className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left">
                        <button 
                          onClick={() => openDrawer(order)}
                          className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 font-medium transition-colors"
                        >
                          <i className="fas fa-eye w-4"></i> Xem chi tiết
                        </button>
                        
                        {order.order_status !== 'completed' && order.order_status !== 'cancelled' && (
                          <div className="border-t border-gray-100">
                            <p className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Đổi trạng thái</p>
                            {order.order_status !== 'pending' && (
                              <button onClick={() => onStatusSelectChange(order.id, 'pending')} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Chờ xác nhận</button>
                            )}
                            {order.order_status !== 'processing' && (
                              <button onClick={() => onStatusSelectChange(order.id, 'processing')} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Đang chuẩn bị</button>
                            )}
                            {order.order_status !== 'shipping' && (
                              <button onClick={() => onStatusSelectChange(order.id, 'shipping')} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Đã bàn giao ĐVVC</button>
                            )}
                            {order.order_status !== 'completed' && (
                              <button onClick={() => onStatusSelectChange(order.id, 'completed')} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400"></span> Hoàn thành</button>
                            )}
                            {order.order_status !== 'cancelled' && (
                              <button onClick={() => onStatusSelectChange(order.id, 'cancelled')} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span> Đã hủy</button>
                            )}
                          </div>
                        )}

                        {order.payment_status !== 'refunded' && 
                         order.order_status !== 'cancelled' && 
                         !(order.payment_method === 'vnpay' && order.payment_status === 'paid') && 
                         !(order.payment_method === 'cod' && order.order_status === 'completed') && (
                          <div className="border-t border-gray-100">
                             <p className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Thanh toán</p>
                             <button onClick={() => handlePaymentStatusChange(order.id, order.payment_status === 'paid' ? 'pending' : 'paid')} className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2 transition-colors">
                                <i className={`fas fa-exchange-alt w-4 text-gray-400`}></i> {order.payment_status === 'paid' ? 'Đánh dấu chưa TT' : 'Đánh dấu đã TT'}
                             </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* SLIDE-OVER DRAWER CHI TIẾT ĐƠN HÀNG */}
      {isDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  Chi tiết đơn hàng
                  <span className="bg-blue-50 text-primary px-3 py-1 rounded-md text-sm">#{selectedOrder.order_code}</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1"><i className="far fa-clock mr-1"></i> Đặt lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Customer Info Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 flex items-center justify-center"><i className="fas fa-map-marker-alt"></i></div>
                    <h4 className="font-bold text-gray-800">Thông tin giao hàng</h4>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-700">{selectedOrder.shipping_name}</p>
                        <p className="text-gray-600 mt-1"><i className="fas fa-phone mr-2 text-gray-400"></i>{selectedOrder.shipping_phone}</p>
                        <p className="text-gray-600 mt-1"><i className="fas fa-map-marker-alt mr-2 text-gray-400"></i>{selectedOrder.shipping_address}</p>
                      </div>
                      {!['completed', 'cancelled', 'returned'].includes(selectedOrder.order_status) && (
                        <button 
                          onClick={() => setShippingModal({
                            isOpen: true, 
                            orderId: selectedOrder.id,
                            shipping_name: selectedOrder.shipping_name,
                            shipping_phone: selectedOrder.shipping_phone,
                            shipping_address: selectedOrder.shipping_address
                          })}
                          className="text-primary hover:text-primary-dark transition text-sm flex items-center gap-1"
                        >
                          <i className="fas fa-edit"></i> Sửa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Status Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><i className="fas fa-info-circle"></i></div>
                    <h4 className="font-bold text-gray-800">Trạng thái</h4>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Thanh toán:</span>
                      {getPaymentBadge(selectedOrder.payment_status)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Đơn hàng:</span>
                      {getStatusBadge(selectedOrder.order_status)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Phương thức:</span>
                      <span className="font-bold text-gray-800 uppercase">{selectedOrder.payment_method}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h4 className="font-bold text-gray-800"><i className="fas fa-box-open text-primary mr-2"></i>Sản phẩm đã đặt</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-4 flex gap-4 hover:bg-gray-50/50 transition-colors">
                      <img src={getImageUrl(item.variant?.product?.thumbnail)} className="w-16 h-16 rounded-lg object-cover border border-gray-200 shadow-sm" alt={item.variant?.product?.name} />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-gray-900 text-sm mb-1 truncate">{item.variant?.product?.name || 'Sản phẩm đã xóa'}</h5>
                        <p className="text-xs text-gray-500 mb-2">Phân loại: {item.variant?.weight}g (SKU: {item.variant?.sku})</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-600">{Number(item.price).toLocaleString('vi-VN')}₫ x {item.quantity}</span>
                          <span className="text-sm font-bold text-primary">{Number(item.price * item.quantity).toLocaleString('vi-VN')}₫</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Tạm tính</span>
                    <span className="font-bold text-gray-900">{Number(selectedOrder.total_amount).toLocaleString('vi-VN')}₫</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Mã giảm giá áp dụng</span>
                    <span className="font-bold text-red-500">- {Number(selectedOrder.discount_amount).toLocaleString('vi-VN')}₫</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200 mt-2 flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">Tổng thanh toán</span>
                    <span className="text-2xl font-bold text-primary">{Number(selectedOrder.final_amount).toLocaleString('vi-VN')}₫</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN TRẠNG THÁI */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal({ isOpen: false, orderId: null, newStatus: '' })}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-10 animate-fade-in text-center transform scale-100">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận cập nhật</h3>
            <p className="text-gray-500 mb-4 text-sm">Bạn có chắc chắn muốn chuyển trạng thái đơn hàng này không?</p>
            
            {confirmModal.newStatus === 'cancelled' && (
               <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium mb-6 text-left border border-red-100">
                  <i className="fas fa-info-circle mr-1"></i> <strong>Lưu ý:</strong> Nếu đơn hàng đã thanh toán qua VNPAY, hệ thống sẽ tự động gửi lệnh hoàn tiền cho khách hàng.
               </div>
            )}
            {confirmModal.newStatus !== 'cancelled' && <div className="mb-8"></div>}

            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, orderId: null, newStatus: '' })}
                className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleStatusChange}
                className="flex-1 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/30 transition-all active:scale-95"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL SỬA THÔNG TIN GIAO HÀNG */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShippingModal({ isOpen: false, orderId: null, shipping_name: '', shipping_phone: '', shipping_address: '' })}></div>
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md relative z-10 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Sửa Thông Tin Giao Hàng</h3>
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
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition font-semibold shadow-sm"
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
