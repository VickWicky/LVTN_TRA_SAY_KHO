import { useState, useEffect, useMemo, useRef } from 'react';
import Pagination from '../../components/admin/Pagination';
import Select from 'react-select';
import { toast, ToastContainer } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


export default function ExportInventory() {
  const [logs, setLogs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [filterReason, setFilterReason] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const fetchIdRef = useRef(0);

  
  const [exportData, setExportData] = useState({
    batch_id: '', quantity: '', reason: 'Xuất hủy (Quá HSD / Hư hỏng)', custom_reason: ''
  });
  
  const fetchLogs = async (page = currentPage, search = debouncedSearch) => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };
      
      let url = `${API_URL}/api/admin/inventory-logs?page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (filterReason) url += `&reason=${encodeURIComponent(filterReason)}`;
      if (filterStartDate) url += `&start_date=${encodeURIComponent(filterStartDate)}`;
      if (filterEndDate) url += `&end_date=${encodeURIComponent(filterEndDate)}`;

      const res = await fetch(url, { headers });

      if (fetchId !== fetchIdRef.current) return;

      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
      }
    } catch (error) {
      console.error('Failed to fetch inventory logs:', error);
      toast.error('Lỗi kết nối máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };
      
      const res = await fetch(`${API_URL}/api/admin/inventory?page=1&search=`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  }

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
  }, [filterReason, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchLogs(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    if (isExportDrawerOpen) {
      fetchBatches();
    }
  }, [isExportDrawerOpen]);

  const submitExport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/inventory-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exportData)
      });
      
      if (res.ok) {
        toast.success('Xuất kho thành công!');
        setIsExportDrawerOpen(false);
        setExportData({ batch_id: '', quantity: '', reason: 'Xuất hủy (Quá HSD / Hư hỏng)', custom_reason: '' });
        fetchLogs(1, debouncedSearch);
      } else {
        const errorData = await res.json();
        toast.error('Lỗi: ' + (errorData.message || 'Không thể xuất kho.'));
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Lỗi hệ thống!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header & Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quản Lý Xuất Kho Khác</h2>
            <p className="text-gray-500 text-sm mt-1">Lịch sử xuất hủy, tặng, lỗi hoặc điều chỉnh</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm mã lô, tên sp..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsExportDrawerOpen(true)}
              className="px-4 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 flex items-center justify-center gap-2"
            >
              <i className="fas fa-file-export"></i> Tạo Phiếu Xuất
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">Từ ngày</label>
            <input 
              type="date" 
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">Đến ngày</label>
            <input 
              type="date" 
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">Lý do</label>
            <select 
              value={filterReason}
              onChange={e => setFilterReason(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary w-48"
            >
              <option value="">Tất cả</option>
              <option value="Xuất hủy (Quá HSD / Hư hỏng)">Xuất hủy (Quá HSD / Hư hỏng)</option>
              <option value="Xuất dùng thử / Tặng">Xuất dùng thử / Tặng</option>
              <option value="Trả lại nhà cung cấp">Trả lại nhà cung cấp</option>
            </select>
          </div>
          {(filterStartDate || filterEndDate || filterReason) && (
            <div className="flex flex-col justify-end h-[46px]">
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterReason(''); }}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Lịch Sử Xuất Kho */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4 pl-6 w-16">ID</th>
                <th className="p-4">Ngày xuất</th>
                <th className="p-4">Lô Hàng & Sản Phẩm</th>
                <th className="p-4">Số Lượng</th>
                <th className="p-4">Lý Do</th>
                <th className="p-4 pr-6">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <i className="fas fa-box-open text-2xl text-gray-300"></i>
                      </div>
                      <p>Chưa có dữ liệu xuất kho</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 text-gray-500">#{log.id}</td>
                    <td className="p-4 font-medium text-gray-900">
                      {new Date(log.created_at).toLocaleString('vi-VN', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{log.batch?.batch_code}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={log.batch?.variant?.product?.name}>
                        {log.batch?.variant?.product?.name} ({log.batch?.variant?.weight}g)
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-100 rounded-full">
                        -{log.quantity}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-700">{log.reason}</div>
                    </td>
                    <td className="p-4 pr-6 text-gray-500">
                      {log.user?.name || 'Hệ thống'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {lastPage > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-end">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* EXPORT DRAWER */}
      {isExportDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsExportDrawerOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="fas fa-file-export text-primary"></i> Tạo Phiếu Xuất Kho
                </h3>
              </div>
              <button onClick={() => !isSubmitting && setIsExportDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl border border-yellow-200 text-sm mb-6 flex items-start gap-3">
                <i className="fas fa-info-circle mt-0.5"></i>
                <p>Sử dụng form này để xuất hủy hàng quá hạn, hàng hư hỏng, xuất tặng hoặc xuất mẫu nội bộ. <b>Không dùng cho bán hàng.</b></p>
              </div>

              <form id="exportForm" onSubmit={submitExport} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Chọn Lô Hàng Cần Xuất <span className="text-red-500">*</span></label>
                  <Select 
                    options={batches.filter(b => b.current_quantity > 0).map(batch => ({
                      value: batch.id,
                      label: `[${batch.batch_code}] ${batch.variant?.product?.name} (${batch.variant?.weight}g) - Tồn: ${batch.current_quantity}`
                    }))}
                    value={batches.filter(b => b.current_quantity > 0).map(batch => ({
                      value: batch.id,
                      label: `[${batch.batch_code}] ${batch.variant?.product?.name} (${batch.variant?.weight}g) - Tồn: ${batch.current_quantity}`
                    })).find(o => o.value == exportData.batch_id) || null}
                    onChange={(selected) => setExportData({...exportData, batch_id: selected ? selected.value : ''})}
                    placeholder="Tìm hoặc chọn lô đang có sẵn trong kho..."
                    isSearchable={true}
                    required
                    className="text-sm"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? '#22c55e' : '#e5e7eb',
                        borderRadius: '0.5rem',
                        minHeight: '42px',
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
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Số lượng xuất <span className="text-red-500">*</span></label>
                  <input 
                    type="number" min="1" 
                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-sm"
                    value={exportData.quantity} 
                    onChange={e => setExportData({...exportData, quantity: e.target.value})} 
                    placeholder="Nhập số lượng (tối đa bằng số lượng tồn)"
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Lý do xuất <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-sm"
                    value={exportData.reason}
                    onChange={e => setExportData({...exportData, reason: e.target.value})}
                    required
                  >
                    <option value="Xuất hủy (Quá HSD / Hư hỏng)">Xuất hủy (Quá HSD / Hư hỏng)</option>
                    <option value="Xuất dùng thử / Tặng">Xuất dùng thử / Tặng</option>
                    <option value="Trả lại nhà cung cấp">Trả lại nhà cung cấp</option>
                    <option value="Khác">Lý do khác...</option>
                  </select>
                </div>

                {exportData.reason === 'Khác' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Nhập lý do cụ thể <span className="text-red-500">*</span></label>
                    <textarea 
                      className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-sm"
                      value={exportData.custom_reason} 
                      onChange={e => setExportData({...exportData, custom_reason: e.target.value})} 
                      placeholder="Ghi rõ lý do xuất kho..."
                      rows="3"
                      required={exportData.reason === 'Khác'}
                    ></textarea>
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setIsExportDrawerOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Hủy
              </button>
              <button form="exportForm" type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Đang xử lý...</> : <><i className="fas fa-check"></i> Xác Nhận Xuất Kho</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
