import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../contexts/AuthContext';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/admin/ConfirmModal';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const { canManageCategories } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    slug: '',
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
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/categories?page=${page}&search=${encodeURIComponent(search)}`, {
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
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

  const handleOpenForm = (category = null) => {
    if (category) {
      setFormData({
        id: category.id,
        name: category.name,
        slug: category.slug,
        is_active: category.is_active
      });
    } else {
      setFormData({ id: null, name: '', slug: '', is_active: true });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isEdit = formData.id !== null;
      let url = `${API_URL}/api/admin/categories`;
      if (isEdit) {
        url = `${url}/${formData.id}`;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          is_active: formData.is_active,
        }),
      });

      if (res.ok) {
        toast.success(isEdit ? 'Cập nhật danh mục thành công!' : 'Thêm danh mục thành công!');
        setIsDrawerOpen(false);
        fetchData(currentPage, debouncedSearch);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Có lỗi xảy ra.');
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
      const res = await fetch(`${API_URL}/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        toast.success('Xóa thành công!');
        fetchData(currentPage, debouncedSearch);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Xóa thất bại.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối!');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Danh Mục</h2>
            <p className="text-gray-500 text-sm mt-1">Quản lý và phân loại nhóm sản phẩm</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm danh mục..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            {canManageCategories && (
              <button 
                onClick={() => handleOpenForm()} 
                className="bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:bg-primary-dark transition flex items-center gap-2 hover:cursor-pointer shadow-sm shadow-primary/30"
              >
                <i className="fas fa-plus"></i> Thêm Danh Mục
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && categories.length === 0 ? (
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
                <th className="p-4 font-bold w-20 text-center">ID</th>
                <th className="p-4 font-bold">Tên Danh Mục</th>
                <th className="p-4 font-bold">URL Slug</th>
                <th className="p-4 font-bold text-center">Trạng Thái</th>
                {canManageCategories && <th className="p-4 font-bold text-center w-20">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-folder-open text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Không tìm thấy danh mục nào</p>
                    </div>
                  </td>
                </tr>
              ) : categories.map(category => (
                <tr key={category.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4 text-center font-medium text-gray-500 text-sm">#{category.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">{category.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-500 text-sm font-mono bg-gray-50/30 rounded">{category.slug}</td>
                  <td className="p-4 text-center">
                    {category.is_active ? (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Hoạt động</span>
                    ) : (
                      <span className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Đã ẩn</span>
                    )}
                  </td>
                  {canManageCategories && (
                    <td className="p-4 text-center relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>

                      {/* Action Dropdown Menu */}
                      {openMenuId === category.id && (
                        <div ref={menuRef} className="absolute right-12 top-10 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left">
                          <button 
                            onClick={() => handleOpenForm(category)}
                            className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 font-medium transition-colors"
                          >
                            <i className="fas fa-edit w-4"></i> Chỉnh sửa
                          </button>
                          <div className="border-t border-gray-100">
                            <button 
                              onClick={() => handleDelete(category.id)} 
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
              ))}
            </tbody>
          </table>
        </div>
        {categories.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* DRAWER FORM */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-folder-plus text-primary"></i> 
                  {formData.id ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                </h3>
              </div>
              <button onClick={() => !isSubmitting && setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <form id="categoryForm" onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên danh mục <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm" required 
                    value={formData.name} onChange={handleNameChange} placeholder="Nhập tên..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Slug (Đường dẫn URL) <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-gray-50 focus:bg-white text-sm" required 
                    value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} 
                  />
                </div>
                
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                    <input type="checkbox" className="w-5 h-5 text-primary rounded focus:ring-primary" checked={formData.is_active} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    />
                    <span className="font-bold text-sm text-gray-700">Trạng thái hiển thị (Active)</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button form="categoryForm" type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu Danh Mục</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={() => { executeDelete(confirmModal.id); setConfirmModal({ isOpen: false, id: null }); }}
        message="Bạn có chắc chắn muốn xóa danh mục này?"
      />
    </div>
  );
}
