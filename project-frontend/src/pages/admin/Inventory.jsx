import { useState, useEffect, useMemo, useRef } from 'react';
import Pagination from '../../components/admin/Pagination';
import Select from 'react-select';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('receipts'); // receipts, batches
  
  const [batches, setBatches] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const fetchIdRef = useRef(0);

  

  
  const initialForm = {
    supplier_id: '',
    items: [{ variant_id: '', quantity: '', import_price: '', mfg_date: '', exp_date: '' }]
  };
  const [formData, setFormData] = useState(initialForm);

  const calculatedTotal = formData.items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.import_price) || 0);
  }, 0);

  const fetchInventoryData = async (page = currentPage, search = debouncedSearch, tab = activeTab) => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };
      
      const [batchRes, receiptRes, supplierRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/inventory?page=${tab === 'batches' ? page : 1}&search=${encodeURIComponent(search)}`, { headers }),
        fetch(`${API_URL}/api/admin/inventory/receipts?page=${tab === 'receipts' ? page : 1}&search=${encodeURIComponent(search)}`, { headers }),
        fetch(`${API_URL}/api/admin/inventory/suppliers`, { headers }),
        fetch(`${API_URL}/api/products`)
      ]);

      if (fetchId !== fetchIdRef.current) return;

      if (batchRes.ok) {
        const bData = await batchRes.json();
        setBatches(bData.data || []);
        if (tab === 'batches') {
          setCurrentPage(bData.current_page);
          setLastPage(bData.last_page);
        }
      }
      if (receiptRes.ok) {
        const rData = await receiptRes.json();
        setReceipts(rData.data || []);
        if (tab === 'receipts') {
          setCurrentPage(rData.current_page);
          setLastPage(rData.last_page);
        }
      }
      if (supplierRes.ok) setSuppliers(await supplierRes.json());
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.data || pData);
      }
      
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
      toast.error('Lỗi kết nối máy chủ!');
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
    fetchInventoryData(currentPage, debouncedSearch, activeTab);
  }, [currentPage, debouncedSearch, activeTab]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const variantOptions = useMemo(() => {
    return products.map(prod => ({
      label: prod.name,
      options: prod.variants?.map(v => ({
        value: v.id,
        label: `${prod.name} (${v.weight}g) - Tồn: ${v.total_stock || 0}`
      })) || []
    }));
  }, [products]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { variant_id: '', quantity: '', import_price: '', mfg_date: '', exp_date: '' }]
    });
  };
  
  const removeItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  }

  const submitImport = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.warning("Vui lòng chọn nhà cung cấp!");
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/inventory/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success('Tạo phiếu nhập thành công!');
        setIsImportDrawerOpen(false);
        setFormData(initialForm);
        fetchInventoryData(currentPage, debouncedSearch, activeTab);
      } else {
        toast.error('Có lỗi xảy ra khi nhập kho.');
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Lỗi hệ thống!');
    } finally {
      setIsSubmitting(false);
    }
  };



  const isExpiringSoon = (expDate) => {
    const exp = new Date(expDate);
    const now = new Date();
    const diffTime = Math.abs(exp - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 90;
  };

  const TABS = [
    { id: 'receipts', label: 'Lịch sử Phiếu Nhập', icon: 'fa-file-invoice' },
    { id: 'batches', label: 'Tồn Kho Theo Lô', icon: 'fa-boxes' }
  ];

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header & Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Kho Hàng</h2>
            <p className="text-gray-500 text-sm mt-1">Quản lý nhập xuất, tồn kho và cảnh báo HSD</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm phiếu, lô hàng..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex gap-2">

              <button 
                onClick={() => setIsImportDrawerOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 flex items-center justify-center gap-2"
              >
                <i className="fas fa-file-import"></i> Tạo Phiếu Nhập
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-100 overflow-x-auto pb-[1px]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); }}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && (receipts.length === 0 && batches.length === 0) ? (
          <div className="absolute inset-0 flex justify-center items-center bg-white/80 z-10 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                <span className="text-gray-500 font-medium">Đang tải dữ liệu...</span>
             </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {activeTab === 'receipts' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-bold text-center w-16">ID</th>
                  <th className="p-4 font-bold">Nhà Cung Cấp</th>
                  <th className="p-4 font-bold text-center">Người Lập</th>
                  <th className="p-4 font-bold text-right">Tổng Tiền</th>
                  <th className="p-4 font-bold text-center">Ngày Lập</th>
                  <th className="p-4 font-bold text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <i className="fas fa-file-invoice text-4xl mb-3 text-gray-300"></i>
                        <p className="text-base font-medium">Không tìm thấy phiếu nhập nào</p>
                      </div>
                    </td>
                  </tr>
                ) : receipts.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-900 text-center">#{receipt.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{receipt.supplier?.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5"><i className="fas fa-phone-alt mr-1"></i> {receipt.supplier?.phone || 'N/A'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium">
                        <i className="fas fa-user-circle text-gray-400"></i> {receipt.user?.name || 'Admin'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-primary text-right">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(receipt.total_amount)}
                    </td>
                    <td className="p-4 text-sm text-gray-500 text-center">
                      {new Date(receipt.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${receipt.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        {receipt.status === 'completed' ? 'Đã Nhập Kho' : receipt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-bold">Mã Lô</th>
                  <th className="p-4 font-bold">Sản Phẩm & Phân Loại</th>
                  <th className="p-4 font-bold text-center">SL Nhập</th>
                  <th className="p-4 font-bold text-center">Tồn Kho</th>
                  <th className="p-4 font-bold text-center">Hạn Sử Dụng</th>
                  <th className="p-4 font-bold text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <i className="fas fa-boxes text-4xl mb-3 text-gray-300"></i>
                        <p className="text-base font-medium">Không tìm thấy lô hàng nào</p>
                      </div>
                    </td>
                  </tr>
                ) : batches.map(batch => {
                  const expiring = isExpiringSoon(batch.exp_date);
                  const isOutOfStock = batch.current_quantity <= 0;
                  return (
                    <tr key={batch.id} className={`hover:bg-blue-50/30 transition-colors ${isOutOfStock ? 'opacity-60' : ''}`}>
                      <td className="p-4 font-mono font-bold text-gray-900">{batch.batch_code}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900 text-sm line-clamp-1">{batch.variant?.product?.name}</div>
                        <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                          <i className="fas fa-tag text-gray-400"></i> {batch.variant?.weight}g (SKU: {batch.variant?.sku})
                        </div>
                      </td>
                      <td className="p-4 text-center text-gray-500 font-medium">{batch.initial_quantity}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md text-sm font-bold border ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {batch.current_quantity}
                        </span>
                      </td>
                      <td className={`p-4 text-sm font-semibold text-center ${expiring ? 'text-red-600' : 'text-gray-600'}`}>
                        {new Date(batch.exp_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-4 text-center">
                        {isOutOfStock ? (
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs font-bold border border-gray-200">Hết Hàng</span>
                        ) : expiring ? (
                          <span className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded text-xs font-bold shadow-sm inline-flex items-center gap-1">
                            <i className="fas fa-exclamation-triangle"></i> Sắp Hết Hạn
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded text-xs font-bold shadow-sm">Tốt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {((activeTab === 'receipts' && receipts.length > 0) || (activeTab === 'batches' && batches.length > 0)) && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* IMPORT DRAWER (TẠO PHIẾU NHẬP) */}
      {isImportDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsImportDrawerOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-file-import text-primary"></i> Tạo Phiếu Nhập Kho
                </h3>
                <p className="text-sm text-gray-500 mt-1">Nhập hàng mới từ nhà cung cấp</p>
              </div>
              <button onClick={() => !isSubmitting && setIsImportDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              <form id="importForm" onSubmit={submitImport} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Nhà Cung Cấp <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50 focus:bg-white text-sm transition-colors" 
                      value={formData.supplier_id} 
                      onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                      required
                    >
                      <option value="">-- Chọn Nhà Cung Cấp --</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tổng Tiền Nhập (Tạm tính)</label>
                    <div className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-100 font-bold text-primary text-xl flex items-center justify-between shadow-inner">
                      <span>VNĐ</span>
                      <span>{new Intl.NumberFormat('vi-VN').format(calculatedTotal)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h4 className="font-bold text-gray-800"><i className="fas fa-boxes text-primary mr-2"></i>Chi tiết hàng nhập</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end bg-gray-50/80 p-4 rounded-xl border border-gray-200 relative group transition-colors hover:border-blue-200">
                        {formData.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="absolute -top-3 -right-3 bg-white w-7 h-7 rounded-full border border-gray-200 text-red-500 hover:text-white hover:bg-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        )}
                        <div className="lg:col-span-4">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">Sản phẩm (Biến thể) <span className="text-red-500">*</span></label>
                          <Select
                            options={variantOptions}
                            value={variantOptions.flatMap(g => g.options).find(o => o.value === item.variant_id) || null}
                            onChange={(selected) => handleItemChange(index, 'variant_id', selected ? selected.value : '')}
                            placeholder="Tìm/chọn sản phẩm..."
                            isSearchable={true}
                            required
                            className="text-sm"
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                borderColor: state.isFocused ? '#22c55e' : '#e5e7eb',
                                borderRadius: '0.5rem',
                                minHeight: '38px',
                                boxShadow: state.isFocused ? '0 0 0 1px #22c55e' : 'none',
                                '&:hover': {
                                  borderColor: '#22c55e'
                                }
                              }),
                              menuPortal: base => ({ ...base, zIndex: 9999 })
                            }}
                            menuPortalTarget={document.body}
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">Số lượng <span className="text-red-500">*</span></label>
                          <input type="number" min="1" className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">Giá nhập/SP <span className="text-red-500">*</span></label>
                          <input type="number" min="0" className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none" value={item.import_price} onChange={e => handleItemChange(index, 'import_price', e.target.value)} required />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">NSX <span className="text-red-500">*</span></label>
                          <input type="date" className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none" value={item.mfg_date} onChange={e => handleItemChange(index, 'mfg_date', e.target.value)} required />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">HSD <span className="text-red-500">*</span></label>
                          <input type="date" className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none" value={item.exp_date} onChange={e => handleItemChange(index, 'exp_date', e.target.value)} required />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addItem} className="text-sm bg-blue-50 text-blue-600 font-bold px-4 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-2">
                      <i className="fas fa-plus"></i> Thêm dòng sản phẩm
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsImportDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button form="importForm" type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Đang xử lý...</> : <><i className="fas fa-save"></i> Hoàn Thành Nhập Kho</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
