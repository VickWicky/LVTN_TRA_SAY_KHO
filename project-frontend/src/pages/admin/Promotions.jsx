import { useState, useEffect, useRef } from 'react';
import Pagination from '../../components/admin/Pagination';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const fetchIdRef = useRef(0);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [statsModal, setStatsModal] = useState({ isOpen: false, data: null, loading: false, promo: null });
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [viewDetailsDrawer, setViewDetailsDrawer] = useState(null);
  const [searchRefKeyword, setSearchRefKeyword] = useState('');
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: '',
    apply_to: 'all',
    reference_ids: [],
    is_active: true
  });

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
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const [promoRes, catRes, prodRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/admin/promotions?page=${page}&search=${encodeURIComponent(search)}`, { headers }),
        fetch('http://127.0.0.1:8000/api/admin/categories/active', { headers }),
        fetch('http://127.0.0.1:8000/api/admin/products', { headers })
      ]);

      if (fetchId !== fetchIdRef.current) return;

      if (promoRes.ok) {
        const data = await promoRes.json();
        setPromotions(data.data || []);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
      }
      if (catRes.ok) setCategories(await catRes.json());
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.data || pData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Lỗi khi tải dữ liệu từ máy chủ.');
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
    fetchData(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const handleOpenForm = (promotion = null) => {
    if (promotion) {
      setEditingPromotion(promotion);
      let refs = [];
      if (promotion.apply_to === 'category') refs = promotion.categories?.map(c => c.id) || [];
      if (promotion.apply_to === 'product') refs = promotion.products?.map(p => p.id) || [];
      if (promotion.apply_to === 'variant') refs = promotion.variants?.map(v => v.id) || [];
      
      setFormData({
        name: promotion.name,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value,
        start_date: promotion.start_date ? String(promotion.start_date).slice(0, 16) : '',
        end_date: promotion.end_date ? String(promotion.end_date).slice(0, 16) : '',
        apply_to: promotion.apply_to,
        reference_ids: refs,
        is_active: promotion.is_active
      });
      setSearchRefKeyword('');
    } else {
      setEditingPromotion(null);
      setFormData({
        name: '',
        discount_type: 'percent',
        discount_value: '',
        start_date: '',
        end_date: '',
        apply_to: 'all',
        reference_ids: [],
        is_active: true
      });
      setSearchRefKeyword('');
    }
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingPromotion 
        ? `http://127.0.0.1:8000/api/admin/promotions/${editingPromotion.id}`
        : 'http://127.0.0.1:8000/api/admin/promotions';
        
      const res = await fetch(url, {
        method: editingPromotion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingPromotion ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
        setIsDrawerOpen(false);
        fetchData(currentPage, debouncedSearch);
      } else {
        const data = await res.json();
        toast.error('Có lỗi xảy ra: ' + JSON.stringify(data.errors || data.message));
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Có lỗi xảy ra.');
    }
  };

  const fetchStats = async (promo) => {
    setOpenMenuId(null);
    setStatsModal({ isOpen: true, loading: true, data: null, promo });
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/promotions/${promo.id}/stats`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setStatsModal({ isOpen: true, loading: false, data, promo });
      } else {
        toast.error('Không thể lấy thống kê.');
        setStatsModal({ isOpen: false, loading: false, data: null, promo: null });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Có lỗi xảy ra khi tải thống kê.');
      setStatsModal({ isOpen: false, loading: false, data: null, promo: null });
    }
  };

  const handleReferenceChange = (e) => {
    const value = parseInt(e.target.value);
    setFormData(prev => {
      const isSelected = prev.reference_ids.includes(value);
      let newRefs;
      if (isSelected) {
        newRefs = prev.reference_ids.filter(id => id !== value);
      } else {
        newRefs = [...prev.reference_ids, value];
      }
      return { ...prev, reference_ids: newRefs };
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Khuyến Mãi</h2>
            <p className="text-gray-500 text-sm mt-1">Các chương trình giảm giá và sự kiện</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm chiến dịch khuyến mãi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <button 
              onClick={() => handleOpenForm()} 
              className="bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:bg-primary-dark transition flex items-center gap-2 hover:cursor-pointer shadow-sm shadow-primary/30"
            >
              <i className="fas fa-plus"></i> Thêm Khuyến Mãi
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && promotions.length === 0 ? (
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
                <th className="p-4 font-bold">Tên Chiến Dịch</th>
                <th className="p-4 font-bold text-center">Mức Giảm</th>
                <th className="p-4 font-bold text-center">Thời Gian</th>
                <th className="p-4 font-bold text-center">Phạm Vi Áp Dụng</th>
                <th className="p-4 font-bold text-center">Trạng Thái</th>
                <th className="p-4 font-bold text-center w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-tags text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Chưa có khuyến mãi nào</p>
                    </div>
                  </td>
                </tr>
              ) : promotions.map(promo => {
                const now = new Date();
                const startDate = new Date(promo.start_date);
                const endDate = new Date(promo.end_date);
                const isExpired = now > endDate;
                let statusObj = { label: 'Chưa diễn ra', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: 'fa-clock' };
                
                if (!promo.is_active) {
                  statusObj = { label: 'Tạm dừng', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: 'fa-pause-circle' };
                } else if (now > endDate) {
                  statusObj = { label: 'Đã kết thúc', color: 'bg-red-50 text-red-600 border-red-200', icon: 'fa-times-circle' };
                } else if (now >= startDate && now <= endDate) {
                  statusObj = { label: 'Đang diễn ra', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: 'fa-check-circle' };
                }

                return (
                  <tr key={promo.id} className={`hover:bg-blue-50/30 transition-colors group ${isExpired ? 'bg-gray-50/50' : ''}`}>
                    <td className="p-4">
                      <div className="font-bold text-gray-900 text-sm mb-1">{promo.name}</div>
                      <div className="text-xs text-gray-500 font-mono">ID: #{promo.id}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center bg-red-50 text-red-600 border border-red-100 font-bold px-3 py-1 rounded-lg text-sm">
                        <i className="fas fa-fire mr-1 text-red-400"></i>
                        {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `${Number(promo.discount_value).toLocaleString('vi-VN')}đ`}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-xs font-semibold text-gray-800">
                        {new Date(promo.start_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-gray-400 my-0.5"><i className="fas fa-arrow-down"></i></div>
                      <div className="text-xs font-semibold text-gray-800">
                        {new Date(promo.end_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {promo.apply_to === 'all' && <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Toàn sàn</span>}
                      {promo.apply_to === 'category' && <span className="bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{promo.categories?.length || 0} Danh mục</span>}
                      {promo.apply_to === 'product' && <span className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{promo.products?.length || 0} Sản phẩm</span>}
                      {promo.apply_to === 'variant' && <span className="bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{promo.variants?.length || 0} Biến thể</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusObj.color}`}>
                        <i className={`fas ${statusObj.icon}`}></i> {statusObj.label}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`relative inline-block text-left ${openMenuId === promo.id ? 'z-50' : ''}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === promo.id ? null : promo.id); }}
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                        >
                          <i className="fas fa-ellipsis-v"></i>
                        </button>

                        {openMenuId === promo.id && (
                          <div ref={menuRef} className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[70] animate-fade-in text-left">
                            <button 
                              onClick={() => { setViewDetailsDrawer(promo); setOpenMenuId(null); }}
                              className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-medium transition-colors"
                            >
                              <i className="fas fa-eye w-4 text-gray-400"></i> Xem chi tiết
                            </button>
                            
                            <button 
                              onClick={() => !isExpired && handleOpenForm(promo)}
                              disabled={isExpired}
                              className={`w-full px-4 py-2.5 text-sm flex items-center gap-3 font-medium transition-colors ${isExpired ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                              title={isExpired ? 'Không thể sửa khuyến mãi đã kết thúc' : ''}
                            >
                              <i className="fas fa-edit w-4"></i> Chỉnh sửa
                            </button>
                            
                            <button 
                              onClick={() => { setOpenMenuId(null); fetchStats(promo); }}
                              className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 font-medium transition-colors"
                            >
                              <i className="fas fa-chart-line w-4"></i> Thống kê
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {promotions.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* DRAWER FORM */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-tags text-primary"></i> 
                  {editingPromotion ? 'Sửa Khuyến Mãi' : 'Thêm Khuyến Mãi Mới'}
                </h3>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              <form id="promoForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Thông tin chung */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Thông tin chung</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên chiến dịch <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      placeholder="VD: Khuyến mãi mừng khai trương"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Loại giảm giá</label>
                      <select 
                        value={formData.discount_type}
                        onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      >
                        <option value="percent">Giảm theo %</option>
                        <option value="fixed">Giảm số tiền cố định</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Mức giảm <span className="text-red-500">*</span></label>
                      <input 
                        type="number" required min="0" step="0.01"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-bold text-red-600"
                        placeholder={formData.discount_type === 'percent' ? "10" : "50000"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Bắt đầu <span className="text-red-500">*</span></label>
                      <input 
                        type="datetime-local" required
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Kết thúc <span className="text-red-500">*</span></label>
                      <input 
                        type="datetime-local" required
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Phạm vi áp dụng */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Phạm vi áp dụng</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Áp dụng cho</label>
                    <select 
                      value={formData.apply_to}
                      onChange={(e) => {
                        setFormData({...formData, apply_to: e.target.value, reference_ids: []});
                        setSearchRefKeyword('');
                      }}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-gray-50"
                    >
                      <option value="all">Toàn bộ cửa hàng (Tất cả sản phẩm)</option>
                      <option value="category">Chỉ định Danh mục</option>
                      <option value="product">Chỉ định Sản phẩm</option>
                      <option value="variant">Chỉ định Biến thể cụ thể</option>
                    </select>
                  </div>

                  {formData.apply_to !== 'all' && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                        <p className="text-sm font-bold text-blue-800">
                          Chọn các {formData.apply_to === 'category' ? 'danh mục' : formData.apply_to === 'product' ? 'sản phẩm' : 'biến thể'}:
                        </p>
                        <div className="relative">
                          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input 
                            type="text" placeholder="Tìm nhanh..."
                            value={searchRefKeyword}
                            onChange={e => setSearchRefKeyword(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white w-full sm:w-48"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar bg-white p-3 rounded-lg border border-gray-100">
                        {formData.apply_to === 'category' && categories.filter(c => c.name.toLowerCase().includes(searchRefKeyword.toLowerCase())).map(cat => (
                          <label key={cat.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                            <input 
                              type="checkbox" value={cat.id}
                              checked={formData.reference_ids.includes(cat.id)}
                              onChange={handleReferenceChange}
                              className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                          </label>
                        ))}

                        {formData.apply_to === 'product' && products.filter(p => p.name.toLowerCase().includes(searchRefKeyword.toLowerCase())).map(prod => (
                          <label key={prod.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                            <input 
                              type="checkbox" value={prod.id}
                              checked={formData.reference_ids.includes(prod.id)}
                              onChange={handleReferenceChange}
                              className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            <div className="flex items-center gap-2">
                              {prod.thumbnail && <img src={getImageUrl(prod.thumbnail)} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />}
                              <span className="text-sm font-medium text-gray-700">{prod.name}</span>
                            </div>
                          </label>
                        ))}

                        {formData.apply_to === 'variant' && products.flatMap(p => p.variants.map(v => ({...v, productName: p.name})))
                          .filter(v => `${v.productName} ${v.sku}`.toLowerCase().includes(searchRefKeyword.toLowerCase()))
                          .map(variant => (
                          <label key={variant.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                            <input 
                              type="checkbox" value={variant.id}
                              checked={formData.reference_ids.includes(variant.id)}
                              onChange={handleReferenceChange}
                              className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800">{variant.productName}</span>
                              <span className="text-xs text-gray-500">Phân loại: {variant.weight}g - SKU: {variant.sku}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setFormData({...formData, is_active: !formData.is_active})}>
                  <input 
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">Kích hoạt chiến dịch</span>
                    <span className="text-xs text-gray-500">Cho phép hệ thống áp dụng khuyến mãi này khi đến thời gian bắt đầu.</span>
                  </div>
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button form="promoForm" type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95">
                <i className="fas fa-save"></i> Lưu Chiến Dịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS DRAWER */}
      {viewDetailsDrawer && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setViewDetailsDrawer(null)}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-white z-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-400"></div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Chi Tiết Khuyến Mãi
                </h3>
                <p className="text-sm text-primary font-bold mt-1 line-clamp-1">{viewDetailsDrawer.name}</p>
              </div>
              <button onClick={() => setViewDetailsDrawer(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              <div className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Mức Giảm</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-lg">
                        <i className="fas fa-ticket-alt"></i>
                      </div>
                      <p className="text-xl font-bold text-red-600">
                        {viewDetailsDrawer.discount_type === 'percent' ? `${viewDetailsDrawer.discount_value}%` : `${Number(viewDetailsDrawer.discount_value).toLocaleString('vi-VN')}đ`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Phạm Vi</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-lg">
                        <i className="fas fa-bullseye"></i>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {viewDetailsDrawer.apply_to === 'all' && 'Toàn bộ cửa hàng'}
                        {viewDetailsDrawer.apply_to === 'category' && 'Danh mục chỉ định'}
                        {viewDetailsDrawer.apply_to === 'product' && 'Sản phẩm chỉ định'}
                        {viewDetailsDrawer.apply_to === 'variant' && 'Biến thể chỉ định'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-500 flex items-center justify-center text-lg shrink-0">
                    <i className="far fa-calendar-alt"></i>
                  </div>
                  <div className="flex-1 flex justify-between items-center text-sm font-semibold text-gray-800">
                    <div>
                      <p className="text-xs text-gray-400 font-normal mb-0.5">Bắt đầu</p>
                      {new Date(viewDetailsDrawer.start_date).toLocaleString('vi-VN')}
                    </div>
                    <i className="fas fa-long-arrow-alt-right text-gray-300"></i>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-normal mb-0.5">Kết thúc</p>
                      {new Date(viewDetailsDrawer.end_date).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <i className="fas fa-list-ul text-primary"></i> Danh sách áp dụng
                    </h4>
                    <span className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                      {viewDetailsDrawer.apply_to === 'category' && `${viewDetailsDrawer.categories?.length || 0} mục`}
                      {viewDetailsDrawer.apply_to === 'product' && `${viewDetailsDrawer.products?.length || 0} mục`}
                      {viewDetailsDrawer.apply_to === 'variant' && `${viewDetailsDrawer.variants?.length || 0} mục`}
                      {viewDetailsDrawer.apply_to === 'all' && `Tất cả sản phẩm`}
                    </span>
                  </div>
                  <div className="p-5 bg-gray-50/30">
                    {viewDetailsDrawer.apply_to === 'all' && (
                      <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-4">
                          <i className="fas fa-globe text-3xl text-blue-300"></i>
                        </div>
                        <p className="text-sm font-medium">Khuyến mãi tự động áp dụng cho tất cả sản phẩm.</p>
                      </div>
                    )}
                    
                    {viewDetailsDrawer.apply_to === 'category' && (
                      <div className="flex flex-wrap gap-2">
                        {viewDetailsDrawer.categories?.length > 0 ? viewDetailsDrawer.categories.map(c => (
                          <span key={c.id} className="bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                            <i className="fas fa-tag text-purple-400"></i> {c.name}
                          </span>
                        )) : <p className="text-gray-400 italic text-sm">Chưa có danh mục nào.</p>}
                      </div>
                    )}
                    
                    {viewDetailsDrawer.apply_to === 'product' && (
                      <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                        {viewDetailsDrawer.products?.length > 0 ? viewDetailsDrawer.products.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
                              {p.thumbnail ? <img src={getImageUrl(p.thumbnail)} alt={p.name} className="w-full h-full object-cover" /> : <i className="fas fa-image text-gray-300 flex items-center justify-center h-full"></i>}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">ID: {p.id}</p>
                            </div>
                          </div>
                        )) : <p className="text-gray-400 italic text-sm">Chưa có sản phẩm nào.</p>}
                      </div>
                    )}
                    
                    {viewDetailsDrawer.apply_to === 'variant' && (
                      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm max-h-80 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left bg-white text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr className="border-b border-gray-200 text-xs text-gray-500">
                              <th className="p-3 font-bold">Biến thể (SKU)</th>
                              <th className="p-3 font-bold text-center">Phân loại</th>
                              <th className="p-3 font-bold text-right">Giá gốc</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {viewDetailsDrawer.variants?.length > 0 ? viewDetailsDrawer.variants.map(v => (
                              <tr key={v.id} className="hover:bg-gray-50/80">
                                <td className="p-3 font-bold text-gray-800">
                                  {v.sku}
                                </td>
                                <td className="p-3 text-center text-gray-600 font-medium">{v.weight}g</td>
                                <td className="p-3 text-right font-bold text-gray-400 line-through decoration-red-400">{Number(v.price).toLocaleString('vi-VN')}đ</td>
                              </tr>
                            )) : <tr><td colSpan="3" className="p-6 text-center text-gray-400 italic">Chưa có biến thể nào.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {statsModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setStatsModal({ isOpen: false, data: null, loading: false, promo: null })}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <i className="fas fa-chart-line text-emerald-500"></i>
                Thống Kê Khuyến Mãi
              </h3>
              <button 
                onClick={() => setStatsModal({ isOpen: false, data: null, loading: false, promo: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-500 mb-1">Chiến dịch</p>
                <p className="font-bold text-gray-900 text-lg">{statsModal.promo?.name}</p>
              </div>

              {statsModal.loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                      <div className="text-blue-500 mb-2"><i className="fas fa-box-open text-2xl"></i></div>
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Đã Bán</p>
                      <p className="text-2xl font-bold text-blue-700">{statsModal.data?.total_sold || 0}</p>
                      <p className="text-[10px] text-blue-500 mt-1">sản phẩm</p>
                    </div>
                    
                    <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                      <div className="text-emerald-500 mb-2"><i className="fas fa-money-bill-wave text-2xl"></i></div>
                      <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Doanh Thu</p>
                      <p className="text-xl font-bold text-emerald-700">{Number(statsModal.data?.total_revenue || 0).toLocaleString('vi-VN')}đ</p>
                      <p className="text-[10px] text-emerald-500 mt-1">VNĐ</p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <i className="fas fa-boxes text-emerald-600"></i>
                        Sản phẩm áp dụng trong chiến dịch
                      </span>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {statsModal.data?.items_breakdown?.length || 0} biến thể
                      </span>
                    </h4>

                    {statsModal.data?.items_breakdown && statsModal.data.items_breakdown.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {statsModal.data.items_breakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50/80 p-3 rounded-xl text-sm border border-gray-100 hover:bg-gray-100/60 hover:border-gray-200 transition-all">
                            <div className="overflow-hidden pr-3">
                              <p className="font-semibold text-gray-800 truncate">{item.product_name}</p>
                              <p className="text-xs font-medium text-emerald-600 mt-0.5 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                <i className="fas fa-tag text-[10px]"></i> Gói {item.variant_weight}g
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-500">
                                Đã bán: <span className={`font-bold ${item.sold > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{item.sold}</span>
                              </p>
                              <p className={`font-bold text-sm mt-0.5 ${item.revenue > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                {Number(item.revenue || 0).toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-2">
                        <i className="fas fa-inbox text-gray-300 text-3xl mb-2 block"></i>
                        <p className="text-xs text-gray-400 font-medium italic">Không có biến thể nào thuộc phạm vi áp dụng hiện tại.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
