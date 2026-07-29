import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAuthToken } from '../../utils';

export default function Settings() {
  const [settings, setSettings] = useState({
    store_name: 'CK Tea',
    contact_phone: '0123 456 789',
    contact_email: 'hello@cktea.vn',
    footer_description: 'Chuyên cung cấp trà sấy khô chất lượng cao, giữ trọn hương vị tự nhiên và dưỡng chất cho sức khỏe gia đình bạn.',
    branches: []
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data, branches: data.branches || [] }));
      }
    } catch { toast.error('Lỗi tải cấu hình'); }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        toast.success('Lưu cấu hình thành công!');
      } else {
        toast.error('Lỗi khi lưu cấu hình');
      }
    } catch { toast.error('Lỗi kết nối'); }
    setIsLoading(false);
  };

  const addBranch = () => {
    setSettings({
      ...settings,
      branches: [...settings.branches, { name: '', address: '' }]
    });
  };

  const updateBranch = (index, field, value) => {
    const newBranches = [...settings.branches];
    newBranches[index][field] = value;
    setSettings({ ...settings, branches: newBranches });
  };

  const removeBranch = (index) => {
    const newBranches = settings.branches.filter((_, i) => i !== index);
    setSettings({ ...settings, branches: newBranches });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Cấu hình Website</h2>
          <p className="text-gray-500 text-sm mt-1">Thay đổi thông tin cửa hàng và chi nhánh</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isLoading}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-primary/30 transition flex items-center gap-2 disabled:opacity-70 active:scale-95"
        >
          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} 
          {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><i className="fas fa-info-circle text-primary"></i> Thông tin chung</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tên cửa hàng</label>
            <input 
              type="text" 
              value={settings.store_name} 
              onChange={e => setSettings({...settings, store_name: e.target.value})} 
              className="w-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-xl transition-colors bg-gray-50 focus:bg-white text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại liên hệ</label>
            <input 
              type="text" 
              value={settings.contact_phone} 
              onChange={e => setSettings({...settings, contact_phone: e.target.value})} 
              className="w-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-xl transition-colors bg-gray-50 focus:bg-white text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email liên hệ</label>
            <input 
              type="email" 
              value={settings.contact_email} 
              onChange={e => setSettings({...settings, contact_email: e.target.value})} 
              className="w-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-xl transition-colors bg-gray-50 focus:bg-white text-sm" 
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả Footer</label>
            <textarea 
              rows="3"
              value={settings.footer_description} 
              onChange={e => setSettings({...settings, footer_description: e.target.value})} 
              className="w-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-xl transition-colors bg-gray-50 focus:bg-white text-sm resize-none custom-scrollbar" 
            ></textarea>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><i className="fas fa-store-alt text-primary"></i> Hệ thống Chi nhánh</h3>
          <button onClick={addBranch} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 border border-gray-200">
            <i className="fas fa-plus"></i> Thêm chi nhánh
          </button>
        </div>
        
        <div className="p-6 bg-white">
          {settings.branches.length === 0 ? (
            <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <i className="fas fa-map-marker-alt text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 font-medium">Chưa có chi nhánh nào được cấu hình.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.branches.map((branch, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-5 border border-gray-100 rounded-xl bg-gray-50/50 relative group hover:border-gray-300 transition-colors">
                  
                  <div className="absolute top-4 right-4 sm:static sm:order-last">
                    <button 
                      onClick={() => removeBranch(index)} 
                      className="bg-white text-red-500 hover:text-white hover:bg-red-500 border border-gray-200 shadow-sm w-8 h-8 rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                      title="Xóa chi nhánh"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tên Chi Nhánh</label>
                    <input 
                      type="text" 
                      value={branch.name} 
                      onChange={e => updateBranch(index, 'name', e.target.value)} 
                      placeholder="VD: Trụ sở chính (Hà Nội)"
                      className="w-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 px-3 py-2.5 rounded-lg text-sm bg-white font-medium text-gray-800 transition-colors" 
                    />
                  </div>
                  <div className="flex-[2] w-full sm:w-auto">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Địa chỉ cụ thể</label>
                    <input 
                      type="text" 
                      value={branch.address} 
                      onChange={e => updateBranch(index, 'address', e.target.value)} 
                      placeholder="VD: Số 1 Đại Cồ Việt, Hai Bà Trưng"
                      className="w-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 px-3 py-2.5 rounded-lg text-sm bg-white font-medium text-gray-800 transition-colors" 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
