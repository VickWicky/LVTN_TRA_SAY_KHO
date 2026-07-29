import { useState, useEffect, useRef, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/admin/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const fetchIdRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const initialForm = { name: '', phone: '', email: '', address: '' };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuppliers = useCallback(async (page, search) => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/suppliers?page=${page}&search=${encodeURIComponent(search)}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (fetchId !== fetchIdRef.current) return;

      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.data || []);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
      } else {
        toast.error('Lỗi tải danh sách nhà cung cấp.');
      }
    } catch (error) {
      console.error('Lỗi khi fetch suppliers:', error);
      toast.error('Không kết nối được server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchTerm) {
        setDebouncedSearch(searchTerm);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    fetchSuppliers(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchSuppliers]);

  const handleOpenForm = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData(initialForm);
    }
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    const url = editingSupplier 
      ? `${API_URL}/api/admin/suppliers/${editingSupplier.id}` 
      : `${API_URL}/api/admin/suppliers`;
    const method = editingSupplier ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingSupplier ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
        setIsDrawerOpen(false);
        fetchSuppliers(currentPage, debouncedSearch);
      } else {
        const data = await res.json();
        const errorMsg = data.errors ? Object.values(data.errors).flat()[0] : (data.message || 'Lỗi khi lưu nhà cung cấp.');
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Có lỗi xảy ra.');
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
      const res = await fetch(`${API_URL}/api/admin/suppliers/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        toast.success('Đã xóa thành công!');
        fetchSuppliers(currentPage, debouncedSearch);
      } else {
        const data = await res.json();
        toast.error(data.message || 'Lỗi khi xóa.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Có lỗi xảy ra.');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Nhà Cung Cấp</h2>
            <p className="text-gray-500 text-sm mt-1">Danh sách đối tác nhập hàng</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm nhà cung cấp..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <button 
              onClick={() => handleOpenForm()} 
              className="bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:bg-primary-dark transition flex items-center gap-2 hover:cursor-pointer shadow-sm shadow-primary/30"
            >
              <i className="fas fa-plus"></i> Thêm Nhà Cung Cấp
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && suppliers.length === 0 ? (
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
                <th className="p-4 font-bold">Nhà Cung Cấp & Địa chỉ</th>
                <th className="p-4 font-bold">Liên Hệ</th>
                <th className="p-4 font-bold text-center">Ngày Tạo</th>
                <th className="p-4 font-bold text-center w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fas fa-truck-loading text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Chưa có nhà cung cấp nào</p>
                    </div>
                  </td>
                </tr>
              ) : suppliers.map(sup => (
                <tr key={sup.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4 text-center font-medium text-gray-500 text-sm">#{sup.id}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-sm mb-1">{sup.name}</div>
                    <div className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <i className="fas fa-map-marker-alt text-gray-400"></i> {sup.address || 'Chưa cập nhật địa chỉ'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      <i className="fas fa-phone-alt text-gray-400 w-4"></i> {sup.phone || '--'}
                    </div>
                    <div className="text-sm text-gray-500">
                      <i className="fas fa-envelope text-gray-400 w-4"></i> {sup.email || '--'}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500 text-center font-medium">
                    {new Date(sup.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="p-4 text-center relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === sup.id ? null : sup.id)}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>

                    {openMenuId === sup.id && (
                      <div ref={menuRef} className="absolute right-12 top-10 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left">
                        <button 
                          onClick={() => handleOpenForm(sup)}
                          className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 font-medium transition-colors"
                        >
                          <i className="fas fa-edit w-4"></i> Chỉnh sửa
                        </button>
                        <div className="border-t border-gray-100">
                          <button 
                            onClick={() => handleDelete(sup.id)} 
                            className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-3 font-medium transition-colors"
                          >
                            <i className="fas fa-trash-alt w-4"></i> Xóa bỏ
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {suppliers.length > 0 && (
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
                  <i className="fas fa-truck-loading text-primary"></i> 
                  {editingSupplier ? 'Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp'}
                </h3>
              </div>
              <button onClick={() => !isSubmitting && setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <form id="supplierForm" onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên Đối Tác <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-gray-50 focus:bg-white text-sm"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Công ty TNHH ABC..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Số điện thoại</label>
                    <input 
                      type="tel" 
                      className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-gray-50 focus:bg-white text-sm"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="0912..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                    <input 
                      type="email" 
                      className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-gray-50 focus:bg-white text-sm"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="contact@abc.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Địa chỉ</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors bg-gray-50 focus:bg-white text-sm"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Địa chỉ công ty, kho bãi..."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button form="supplierForm" type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-save"></i> Lưu Dữ Liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        message="Bạn có chắc muốn xóa nhà cung cấp này? Lưu ý: Không thể xóa nếu họ đã có phiếu nhập kho."
      />
    </div>
  );
}
