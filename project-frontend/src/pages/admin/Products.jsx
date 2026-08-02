import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/admin/ConfirmModal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Form Drawer
  const [isVariantDrawerOpen, setIsVariantDrawerOpen] = useState(false); // Variant Drawer
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchIdRef = useRef(0); // all, active, hidden

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const { canManageProducts } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const defaultVariant = { sku: '', weight: '', price: '' };

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    slug: '',
    category_id: '',
    description: '',
    ingredient: '',
    usage_instruction: '',
    is_active: true,
    thumbnail: null 
  });

  const [variants, setVariants] = useState([{ ...defaultVariant }]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async (page = currentPage, search = debouncedSearch, status = filterStatus) => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}` 
      };
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/products?page=${page}&search=${encodeURIComponent(search)}`, { headers }),
        fetch(`${API_URL}/api/admin/categories/active`, { headers })
      ]);

      if (fetchId !== fetchIdRef.current) return;

      if (prodRes.ok) {
        const data = await prodRes.json();
        
        // Frontend filtering for status if backend doesn't support it yet
        let finalProducts = data.data || [];
        if (status === 'active') finalProducts = finalProducts.filter(p => p.is_active);
        if (status === 'hidden') finalProducts = finalProducts.filter(p => !p.is_active);

        setProducts(finalProducts);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
      }
      if (catRes.ok) setCategories(await catRes.json());
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
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
    setCurrentPage(1);
  }, [filterStatus]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearch, filterStatus);
  }, [currentPage, debouncedSearch, filterStatus]);

  const handleOpenForm = (product = null) => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name,
        slug: product.slug,
        category_id: product.category_id || '',
        description: product.description || '',
        ingredient: product.ingredient || '',
        usage_instruction: product.usage_instruction || '',
        is_active: product.is_active,
        thumbnail: null 
      });
      setVariants(product.variants.length > 0 ? product.variants : [{ ...defaultVariant }]);
    } else {
      setFormData({ id: null, name: '', slug: '', category_id: '', description: '', ingredient: '', usage_instruction: '', is_active: true, thumbnail: null });
      setVariants([{ ...defaultVariant }]);
    }
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const generateSlug = (text) => {
    return text.toString().toLowerCase()
      .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
      .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
      .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
      .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
      .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
      .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
      .replace(/đ/gi, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData(prev => ({
      ...prev,
      name: newName,
      slug: !prev.id ? generateSlug(newName) : prev.slug 
    }));
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const autoGenerateSKU = (index) => {
    if (formData.name && !variants[index].sku) {
      const newVariants = [...variants];
      const namePart = generateSlug(formData.name).toUpperCase();
      const weightPart = newVariants[index].weight ? `${newVariants[index].weight}` : '';
      newVariants[index].sku = weightPart ? `${namePart}-${weightPart}` : namePart;
      setVariants(newVariants);
    }
  };

  const handleWeightKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      autoGenerateSKU(index);
    }
  };

  const addVariant = () => setVariants([...variants, { ...defaultVariant }]);
  
  const removeVariant = (index) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    } else {
      toast.warning('Phải có ít nhất 1 biến thể!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('slug', formData.slug);
      payload.append('category_id', formData.category_id);
      payload.append('description', formData.description);
      payload.append('ingredient', formData.ingredient);
      payload.append('usage_instruction', formData.usage_instruction);
      payload.append('is_active', formData.is_active ? 1 : 0);
      
      if (formData.thumbnail) {
        payload.append('thumbnail', formData.thumbnail);
      }
      
      payload.append('variants', JSON.stringify(variants));

      const isEdit = formData.id !== null;
      let url = `${API_URL}/api/admin/products`;
      
      if (isEdit) {
        url = `${url}/${formData.id}`;
        payload.append('_method', 'PUT'); 
      }

      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        method: 'POST', 
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: payload,
      });

      if (res.ok) {
        toast.success(isEdit ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
        setIsDrawerOpen(false);
        fetchData(currentPage, debouncedSearch, filterStatus);
      } else {
        const errorData = await res.json();
        let errorMessage = errorData.message || 'Có lỗi xảy ra.';
        if (errorData.errors) {
          const firstErrorKey = Object.keys(errorData.errors)[0];
          errorMessage = errorData.errors[firstErrorKey][0];
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi kết nối máy chủ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
    setOpenMenuId(null);
  };

  const executeDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        toast.success('Xóa thành công!');
        fetchData(currentPage, debouncedSearch, filterStatus);
      } else {
        toast.error('Xóa thất bại.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối!');
    }
  };

  const TABS = [
    { id: 'all', label: 'Tất cả sản phẩm' },
    { id: 'active', label: 'Đang hoạt động' },
    { id: 'hidden', label: 'Đã ẩn' }
  ];

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header & Quick Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Sản Phẩm</h2>
            <p className="text-gray-500 text-sm mt-1">Quản lý kho hàng, biến thể và giá bán</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm sản phẩm..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            {canManageProducts && (
              <button 
                onClick={() => handleOpenForm()} 
                className="bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:bg-primary-dark transition flex items-center gap-2 hover:cursor-pointer shadow-sm shadow-primary/30"
              >
                <i className="fas fa-plus"></i> Thêm Sản Phẩm
              </button>
            )}
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
        {isLoading && products.length === 0 ? (
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
                <th className="p-4 font-bold w-16 text-center">ID</th>
                <th className="p-4 font-bold">Sản Phẩm</th>
                <th className="p-4 font-bold">Danh Mục</th>
                <th className="p-4 font-bold text-center">Biến Thể & Kho</th>
                <th className="p-4 font-bold text-center">Trạng Thái</th>
                {canManageProducts && <th className="p-4 font-bold text-center w-16">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-box-open text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Không tìm thấy sản phẩm nào</p>
                    </div>
                  </td>
                </tr>
              ) : products.map(product => {
                const imgUrl = product.thumbnail 
                  ? (product.thumbnail.startsWith('/') && product.thumbnail.includes('storage') 
                      ? `${API_URL}${product.thumbnail}` 
                      : product.thumbnail)
                  : '/img/placeholder.jpg';

                return (
                  <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 text-gray-500 font-medium text-sm text-center">#{product.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <img src={imgUrl} alt={product.name} className="w-14 h-14 rounded-lg object-cover border border-gray-200 shadow-sm" />
                        <div>
                          <span className="font-bold text-gray-900 text-sm line-clamp-2">{product.name}</span>
                          <span className="text-xs text-gray-500 mt-1 block">/{product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {product.category?.name || 'Không có'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => { setSelectedProduct(product); setIsVariantDrawerOpen(true); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition hover:cursor-pointer border border-blue-100 inline-flex items-center gap-2 shadow-sm"
                      >
                        <i className="fas fa-boxes text-blue-500"></i> {product.variants?.length || 0} loại
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {product.is_active ? (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Hoạt động</span>
                      ) : (
                        <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Đã ẩn</span>
                      )}
                    </td>
                    {canManageProducts && (
                      <td className="p-4 text-center relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                        >
                          <i className="fas fa-ellipsis-v"></i>
                        </button>

                        {/* Action Dropdown Menu */}
                        {openMenuId === product.id && (
                          <div ref={menuRef} className="absolute right-12 top-10 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left">
                            <button 
                              onClick={() => handleOpenForm(product)}
                              className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 font-medium transition-colors"
                            >
                              <i className="fas fa-edit w-4"></i> Chỉnh sửa
                            </button>
                            
                            <div className="border-t border-gray-100">
                              <button 
                                onClick={() => handleDelete(product.id)} 
                                className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-3 font-medium transition-colors"
                              >
                                <i className="fas fa-trash-alt w-4"></i> Xóa bỏ
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* FORM DRAWER (THÊM/SỬA SẢN PHẨM) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {formData.id ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Điền thông tin chi tiết và biến thể sản phẩm</p>
              </div>
              <button onClick={() => !isSubmitting && setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Cột trái: Thông tin cơ bản */}
                  <div className="space-y-5 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
                    <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
                      <i className="fas fa-info-circle text-primary"></i> Thông tin cơ bản
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên sản phẩm <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm" required 
                        value={formData.name} onChange={handleNameChange} placeholder="Nhập tên sản phẩm..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Slug (URL) <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm" required 
                        value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="duong-dan-url"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Danh mục <span className="text-red-500">*</span></label>
                      <select className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm" required
                        value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Ảnh đại diện</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors">
                        <input type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 hover:cursor-pointer" 
                          onChange={e => setFormData({...formData, thumbnail: e.target.files[0]})} 
                        />
                        <p className="text-xs text-gray-400 mt-2">Định dạng: JPG, PNG, GIF. Tối đa 2MB.</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                        <input type="checkbox" className="w-5 h-5 text-primary rounded focus:ring-primary" checked={formData.is_active} 
                          onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                        />
                        <span className="font-bold text-sm text-gray-700">Trạng thái hoạt động (Hiển thị)</span>
                      </label>
                    </div>
                  </div>

                  {/* Cột phải: Thông tin bổ sung & Biến thể */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                      <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <i className="fas fa-align-left text-primary"></i> Chi tiết nội dung
                      </h4>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Mô tả sản phẩm</label>
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm h-24 custom-scrollbar" 
                          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Mô tả chi tiết..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Thành phần</label>
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm h-20 custom-scrollbar" 
                          value={formData.ingredient} onChange={e => setFormData({...formData, ingredient: e.target.value})} placeholder="Mỗi thành phần 1 dòng..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Cách dùng / Pha chế</label>
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm h-20 custom-scrollbar" 
                          value={formData.usage_instruction} onChange={e => setFormData({...formData, usage_instruction: e.target.value})} placeholder="Mỗi bước 1 dòng..."
                        />
                      </div>
                    </div>

                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <i className="fas fa-boxes text-primary"></i> Các biến thể (Phân loại)
                    </h4>
                    <button type="button" onClick={addVariant} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded font-bold hover:bg-green-100 border border-green-200 flex items-center gap-1 transition-colors">
                      <i className="fas fa-plus"></i> Thêm
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {variants.map((variant, index) => (
                      <div key={index} className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 relative group hover:border-blue-200 transition-colors">
                        <button type="button" onClick={() => removeVariant(index)} className="absolute -top-2 -right-2 bg-white w-6 h-6 rounded-full border border-gray-200 text-red-500 hover:text-white hover:bg-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <i className="fas fa-times text-xs"></i>
                        </button>
                        
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-gray-700">Khối lượng (g) <span className="text-red-500">*</span></label>
                            <input type="number" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                              value={variant.weight} 
                              onChange={e => handleVariantChange(index, 'weight', e.target.value)} 
                              onBlur={() => autoGenerateSKU(index)}
                              onKeyDown={(e) => handleWeightKeyDown(e, index)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-gray-700">Mã SKU <span className="text-red-500">*</span></label>
                            <input type="text" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                              value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-gray-700">Giá bán (₫) <span className="text-red-500">*</span></label>
                            <input type="number" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-right font-semibold text-primary" 
                              value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button form="productForm" type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100">
                {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu Sản Phẩm</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VARIANT DRAWER (XEM BIẾN THỂ & KHO) */}
      {isVariantDrawerOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsVariantDrawerOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-boxes text-primary"></i> Biến thể & Tồn kho
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setIsVariantDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th className="p-4 font-bold text-xs uppercase text-gray-500">Phân loại</th>
                      <th className="p-4 font-bold text-xs uppercase text-gray-500 text-right">Giá bán</th>
                      <th className="p-4 font-bold text-xs uppercase text-gray-500 text-center">Tồn kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedProduct.variants?.length === 0 ? (
                      <tr><td colSpan="3" className="p-8 text-center text-gray-500">Không có biến thể nào</td></tr>
                    ) : selectedProduct.variants?.map((v, idx) => {
                      const stock = v.batches_sum_stock || 0;
                      return (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-gray-900 text-sm">{v.weight}g</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{v.sku}</div>
                          </td>
                          <td className="p-4 text-sm font-bold text-primary text-right">{Number(v.price).toLocaleString('vi-VN')}₫</td>
                          <td className="p-4 text-center">
                            {stock > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-[2.5rem] bg-green-50 text-green-700 font-bold px-2 py-1 rounded-md text-sm border border-green-200">{stock}</span>
                            ) : (
                              <span className="bg-red-50 text-red-600 font-bold px-2 py-1 rounded-md text-xs border border-red-200">Hết hàng</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        message="Bạn có chắc chắn muốn xóa sản phẩm này?"
      />
    </div>
  );
}
