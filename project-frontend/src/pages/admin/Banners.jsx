import { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAuthToken } from '../../utils';
import Pagination from '../../components/admin/Pagination';
import ConfirmModal from '../../components/admin/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  
  const [formData, setFormData] = useState({
    title: '', subtitle: '', cta_text: '', cta_link: '', sort_order: 0, is_active: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBanners = async (page = currentPage, search = debouncedSearch) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/banners?page=${page}&search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.data || []);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
      }
    } catch (error) { toast.error('Lỗi khi tải danh sách banner'); }
    setIsLoading(false);
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
    fetchBanners(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const handleOpenForm = (banner = null) => {
    if (banner) {
      setFormData({
        title: banner.title || '', 
        subtitle: banner.subtitle || '',
        cta_text: banner.cta_text || '', 
        cta_link: banner.cta_link || '',
        sort_order: banner.sort_order || 0, 
        is_active: banner.is_active
      });
      setEditId(banner.id);
      setImagePreview(banner.image_url?.startsWith('http') ? banner.image_url : `${API_URL}${banner.image_url}`);
    } else {
      setFormData({ title: '', subtitle: '', cta_text: '', cta_link: '', sort_order: 0, is_active: true });
      setEditId(null);
      setImagePreview(null);
    }
    setImageFile(null);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !imageFile) return toast.error('Vui lòng chọn ảnh banner');
    setIsSubmitting(true);

    const form = new FormData();
    Object.keys(formData).forEach(key => form.append(key, formData[key] === true ? 1 : formData[key] === false ? 0 : formData[key]));
    if (imageFile) {
        form.append('image', imageFile);
    }

    try {
      let url = `${API_URL}/api/admin/banners`;
      
      if (editId) {
        url = `${API_URL}/api/admin/banners/${editId}`;
        form.append('_method', 'PUT');
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getAuthToken()}`,
          'Accept': 'application/json'
        },
        body: form
      });

      if (res.ok) {
        toast.success(editId ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsDrawerOpen(false);
        fetchBanners(currentPage, debouncedSearch);
      } else {
        const errorData = await res.json();
        console.error("Lỗi Validation Backend:", errorData);
        toast.error(errorData.message || 'Có lỗi xảy ra, vui lòng thử lại');
      }
    } catch (error) { 
      toast.error('Lỗi kết nối'); 
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
      const res = await fetch(`${API_URL}/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        toast.success('Đã xóa thành công');
        fetchBanners(currentPage, debouncedSearch);
      } else {
        toast.error('Có lỗi khi xóa banner');
      }
    } catch (error) { toast.error('Lỗi kết nối'); }
  };

  const handleToggleStatus = async (banner) => {
    setOpenMenuId(null);
    const newStatus = !banner.is_active;
    
    // Tạo form giả để PUT update
    const form = new FormData();
    form.append('title', banner.title || '');
    form.append('subtitle', banner.subtitle || '');
    form.append('cta_text', banner.cta_text || '');
    form.append('cta_link', banner.cta_link || '');
    form.append('sort_order', banner.sort_order || 0);
    form.append('is_active', newStatus ? 1 : 0);
    form.append('_method', 'PUT');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/banners/${banner.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
        body: form
      });

      if (res.ok) {
        toast.success(newStatus ? 'Đã bật banner' : 'Đã ẩn banner');
        fetchBanners(currentPage, debouncedSearch);
      } else {
        toast.error('Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Banner</h2>
            <p className="text-gray-500 text-sm mt-1">Thiết lập hình ảnh quảng cáo trang chủ</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm banner..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <button 
              onClick={() => handleOpenForm()} 
              className="bg-primary text-white px-5 py-2 rounded-xl font-semibold hover:bg-primary-dark transition flex items-center gap-2 hover:cursor-pointer shadow-sm shadow-primary/30"
            >
              <i className="fas fa-plus"></i> Thêm Banner
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && banners.length === 0 ? (
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
                <th className="p-4 font-bold text-center w-36">Hình ảnh</th>
                <th className="p-4 font-bold">Nội dung hiển thị</th>
                <th className="p-4 font-bold text-center w-24">Thứ tự</th>
                <th className="p-4 font-bold text-center w-32">Trạng thái</th>
                <th className="p-4 font-bold text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="far fa-images text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">Chưa có banner nào</p>
                    </div>
                  </td>
                </tr>
              ) : banners.map((banner) => (
                <tr key={banner.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4">
                    <div className="w-32 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm mx-auto group-hover:shadow-md transition-shadow">
                      <img src={banner.image_url?.startsWith('http') ? banner.image_url : `${API_URL}${banner.image_url}`} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-sm mb-1">{banner.title || <span className="text-gray-400 italic">Không có tiêu đề chính</span>}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{banner.subtitle || <span className="text-gray-400 italic">Không có tiêu đề phụ</span>}</div>
                    
                    {banner.cta_text && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                        <i className="fas fa-link"></i> {banner.cta_text}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-sm border border-gray-200">
                      {banner.sort_order}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {banner.is_active ? (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> Hiển thị
                      </span>
                    ) : (
                      <span className="bg-gray-50 text-gray-500 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1">
                        <i className="fas fa-eye-slash"></i> Đang ẩn
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === banner.id ? null : banner.id)}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>

                    {openMenuId === banner.id && (
                      <div ref={menuRef} className="absolute right-12 top-10 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left">
                        <button 
                          onClick={() => handleToggleStatus(banner)} 
                          className={`w-full px-4 py-2.5 text-sm ${banner.is_active ? 'text-gray-600 hover:bg-gray-50' : 'text-emerald-600 hover:bg-emerald-50'} text-left flex items-center gap-3 font-medium transition-colors`}
                        >
                          <i className={`fas ${banner.is_active ? 'fa-eye-slash' : 'fa-eye'} w-4`}></i> 
                          {banner.is_active ? 'Ẩn banner' : 'Bật banner'}
                        </button>
                        <button 
                          onClick={() => handleOpenForm(banner)}
                          className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 font-medium transition-colors"
                        >
                          <i className="fas fa-edit w-4"></i> Chỉnh sửa
                        </button>
                        <div className="border-t border-gray-100">
                          <button 
                            onClick={() => handleDelete(banner.id)} 
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
        {banners.length > 0 && (
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
                  <i className="far fa-image text-primary"></i> 
                  {editId ? 'Sửa Banner' : 'Thêm Banner Mới'}
                </h3>
              </div>
              <button onClick={() => !isSubmitting && setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              <form id="bannerForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ảnh Banner <span className="text-red-500">*</span> <span className="text-xs text-gray-400 font-normal">(Tỉ lệ 21:9)</span></label>
                  
                  <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors relative group cursor-pointer">
                    <div className="space-y-2 text-center w-full">
                      {!imagePreview ? (
                        <>
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            <i className="fas fa-cloud-upload-alt text-4xl"></i>
                          </div>
                          <div className="flex text-sm text-gray-600 justify-center">
                            <span className="relative font-medium text-primary hover:text-primary-dark">
                              <span>Tải ảnh lên</span>
                              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                            </span>
                            <p className="pl-1">hoặc kéo thả vào đây</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, WEBP lên đến 2MB</p>
                        </>
                      ) : (
                        <div className="relative w-full">
                          <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg shadow-sm" />
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="relative rounded-md font-bold text-white flex items-center gap-2 bg-primary/80 px-4 py-2 hover:bg-primary">
                              <i className="fas fa-camera"></i> Đổi ảnh
                              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Nội dung hiển thị (Tùy chọn)</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tiêu đề chính</label>
                    <input 
                      type="text" 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" 
                      placeholder="VD: HƯƠNG VỊ THIÊN NHIÊN" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tiêu đề phụ</label>
                    <input 
                      type="text" 
                      value={formData.subtitle} 
                      onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                      className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="Trải nghiệm trà sấy khô chuẩn vị"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Chữ nút bấm (CTA)</label>
                      <input 
                        type="text" 
                        value={formData.cta_text} 
                        onChange={e => setFormData({...formData, cta_text: e.target.value})} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" 
                        placeholder="Khám phá ngay" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Link nút bấm</label>
                      <input 
                        type="text" 
                        value={formData.cta_link} 
                        onChange={e => setFormData({...formData, cta_link: e.target.value})} 
                        className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm" 
                        placeholder="/products" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Cài đặt</h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Thứ tự hiển thị <span className="text-xs text-gray-400 font-normal">(Số nhỏ hiện trước)</span></label>
                    <input 
                      type="number" 
                      value={formData.sort_order} 
                      onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})} 
                      className="w-24 border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm text-center font-bold text-gray-800" 
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg -ml-2 transition-colors" onClick={() => setFormData({...formData, is_active: !formData.is_active})}>
                    <input 
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded text-primary focus:ring-primary w-5 h-5 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">Hiển thị ngoài trang chủ</span>
                      <span className="text-xs text-gray-500">Banner sẽ lập tức xuất hiện nếu được bật.</span>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button form="bannerForm" type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Đang tải...</> : <><i className="fas fa-save"></i> Lưu Banner</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        message="Bạn có chắc chắn muốn xóa banner này?"
      />
    </div>
  );
}
