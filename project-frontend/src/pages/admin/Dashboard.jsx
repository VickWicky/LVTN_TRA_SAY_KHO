import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const { roles } = useAuth();
  const isStaff = roles.includes('staff');
  const isSales = roles.includes('sales');
  
  const [timeRange, setTimeRange] = useState('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    total_revenue: 0,
    total_orders: 0,
    total_products: 0,
    total_users: 0,
    trends: {
      revenue: 0,
      orders: 0,
      products: 0,
      users: 0
    },
    recent_orders: [],
    revenue_by_day: [],
    revenue_by_month: [],
    orders_by_status: [],
    top_products: []
  });
  const [isLoading, setIsLoading] = useState(true);

  if (isStaff) {
    return <Navigate to="/admin/inventory" replace />;
  }

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Thêm tham số timeRange vào API, ví dụ: ?range=7days
      let url = `http://127.0.0.1:8000/api/admin/dashboard-stats?range=${timeRange}`;
      if (timeRange === 'custom') {
        if (!startDate || !endDate) {
          setIsLoading(false);
          return;
        }
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Fallback for trends and new charts if backend not yet updated
        const filledData = {
          ...data,
          trends: data.trends || { revenue: 0, orders: 0, products: 0, users: 0 },
          revenue_by_month: data.revenue_by_month || []
        };
        setStats(filledData);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-fetch if not custom, or if custom has both dates
    if (timeRange !== 'custom' || (timeRange === 'custom' && startDate && endDate)) {
      fetchStats();
    }

    const handleRefresh = () => {
      if (timeRange !== 'custom' || (timeRange === 'custom' && startDate && endDate)) {
        fetchStats();
      }
    };
    window.addEventListener('refreshData', handleRefresh);

    return () => {
      window.removeEventListener('refreshData', handleRefresh);
    };
  }, [timeRange]); // We intentionally do not auto-fetch on every keystroke of startDate/endDate. We will use a button.

  if (isLoading && !stats.total_revenue) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Colors for Pie Chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

  // Format revenue date for Area Chart
  const formatRevenueData = (stats.revenue_by_day || []).map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
    revenue: Number(item.revenue),
    orders: Number(item.orders || 0) // Giả định backend trả thêm số lượng đơn
  }));

  // Format revenue month for Bar Chart
  const formatMonthData = (stats.revenue_by_month || []).map(item => ({
    name: item.month, // VD: "Tháng 1"
    revenue: Number(item.revenue)
  }));

  // Format status translations
  const statusTranslations = {
    pending: 'Chờ xác nhận',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    returned: 'Trả hàng'
  };

  const paymentMethodTranslations = {
    cod: 'Tiền mặt',
    vnpay: 'VNPay',
    momo: 'MoMo'
  };

  const formatStatusData = (stats.orders_by_status || []).map(item => ({
    name: statusTranslations[item.name] || item.name,
    value: item.value
  }));

  const handleExportExcel = () => {
    const timeLabel = timeRange === 'today' ? 'Hôm nay' : timeRange === '7days' ? '7 Ngày qua' : timeRange === 'thisMonth' ? 'Tháng này' : timeRange === 'thisYear' ? 'Năm nay' : 'Tất cả';

    const wb = XLSX.utils.book_new();

    // 1. Sheet Tổng Quan
    const overviewData = [
      ['BÁO CÁO TỔNG QUAN HỆ THỐNG'],
      ['Thời gian lọc:', timeLabel],
      ['Ngày xuất:', new Date().toLocaleString('vi-VN')],
      [],
      ['Thống kê chung'],
      ['Chỉ tiêu', 'Giá trị'],
      ...(!isSales ? [['Tổng Doanh Thu (VNĐ)', stats.total_revenue]] : []),
      ['Tổng Số Đơn Hàng', stats.total_orders],
      ['Tổng Số Sản Phẩm', stats.total_products],
      ['Tổng Số Khách Hàng', stats.total_users],
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    wsOverview['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng Quan');

    // 2. Sheet Đơn Hàng
    const ordersData = [
      ['DANH SÁCH ĐƠN HÀNG GẦN ĐÂY'],
      ['Thời gian lọc:', timeLabel],
      [],
      ['Mã Đơn', 'Khách Hàng', 'Ngày Đặt', 'Phương thức', 'Tổng Tiền (VNĐ)', 'Trạng Thái'],
      ...(stats.recent_orders || []).map(order => [
        order.order_code,
        order.shipping_name,
        new Date(order.created_at).toLocaleString('vi-VN'),
        paymentMethodTranslations[order.payment_method] || order.payment_method || 'N/A',
        Number(order.final_amount),
        statusTranslations[order.order_status] || order.order_status
      ])
    ];
    const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
    wsOrders['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Đơn Hàng Gần Đây');

    // 3. Sheet Sản Phẩm
    const productsData = [
      ['TOP SẢN PHẨM BÁN CHẠY'],
      ['Thời gian lọc:', timeLabel],
      [],
      ['STT', 'Tên Sản Phẩm', 'Số Lượng Đã Bán'],
      ...(stats.top_products || []).map((product, idx) => [
        idx + 1,
        product.name,
        Number(product.total_sold)
      ])
    ];
    const wsProducts = XLSX.utils.aoa_to_sheet(productsData);
    wsProducts['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Sản Phẩm');

    // Xuất file
    const fileName = `Bao_Cao_Thong_Ke_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const loadMockData = () => {
    // Generate some random fake trends
    const fakeTrends = {
      revenue: (Math.random() * 30 - 5).toFixed(1), // -5 to +25
      orders: (Math.random() * 20 - 2).toFixed(1),
      products: (Math.random() * 10).toFixed(1),
      users: (Math.random() * 15 - 5).toFixed(1)
    };

    setStats({
      total_revenue: 125000000 + Math.floor(Math.random() * 10000000),
      total_orders: 450 + Math.floor(Math.random() * 50),
      total_products: 120,
      total_users: 350 + Math.floor(Math.random() * 20),
      trends: fakeTrends,
      recent_orders: [
        { id: 1, order_code: 'ORD-12345', shipping_name: 'Nguyễn Văn A', created_at: new Date().toISOString(), final_amount: 500000, order_status: 'completed', payment_method: 'vnpay' },
        { id: 2, order_code: 'ORD-12346', shipping_name: 'Trần Thị B', created_at: new Date(Date.now() - 86400000).toISOString(), final_amount: 1200000, order_status: 'processing', payment_method: 'cod' },
        { id: 3, order_code: 'ORD-12347', shipping_name: 'Lê Văn C', created_at: new Date(Date.now() - 86400000*2).toISOString(), final_amount: 350000, order_status: 'pending', payment_method: 'momo' },
        { id: 4, order_code: 'ORD-12348', shipping_name: 'Phạm Thị D', created_at: new Date(Date.now() - 86400000*3).toISOString(), final_amount: 800000, order_status: 'cancelled', payment_method: 'cod' },
        { id: 5, order_code: 'ORD-12349', shipping_name: 'Hoàng Văn E', created_at: new Date(Date.now() - 86400000*4).toISOString(), final_amount: 2100000, order_status: 'completed', payment_method: 'vnpay' }
      ],
      revenue_by_day: [
        { date: new Date(Date.now() - 86400000*6).toISOString(), revenue: 15000000, orders: 12 },
        { date: new Date(Date.now() - 86400000*5).toISOString(), revenue: 18000000, orders: 15 },
        { date: new Date(Date.now() - 86400000*4).toISOString(), revenue: 12000000, orders: 10 },
        { date: new Date(Date.now() - 86400000*3).toISOString(), revenue: 22000000, orders: 20 },
        { date: new Date(Date.now() - 86400000*2).toISOString(), revenue: 25000000, orders: 22 },
        { date: new Date(Date.now() - 86400000*1).toISOString(), revenue: 19000000, orders: 18 },
        { date: new Date().toISOString(), revenue: 14000000, orders: 14 }
      ],
      revenue_by_month: [
        { month: 'T1', revenue: 45000000 },
        { month: 'T2', revenue: 52000000 },
        { month: 'T3', revenue: 38000000 },
        { month: 'T4', revenue: 65000000 },
        { month: 'T5', revenue: 72000000 },
        { month: 'T6', revenue: 85000000 },
        { month: 'T7', revenue: 125000000 }
      ],
      orders_by_status: [
        { name: 'completed', value: 250 + Math.floor(Math.random() * 50) },
        { name: 'processing', value: 50 + Math.floor(Math.random() * 10) },
        { name: 'cancelled', value: 20 + Math.floor(Math.random() * 5) },
        { name: 'returned', value: 10 },
        { name: 'pending', value: 40 }
      ],
      top_products: [
        { name: 'Trà Oolong Cao Cấp', total_sold: 150 + Math.floor(Math.random() * 20) },
        { name: 'Trà Xanh Thái Nguyên', total_sold: 120 + Math.floor(Math.random() * 15) },
        { name: 'Trà Sen Cổ Thụ', total_sold: 95 + Math.floor(Math.random() * 10) },
        { name: 'Trà Hoa Cúc Mật Ong', total_sold: 80 },
        { name: 'Trà Đen Hoàng Gia', total_sold: 65 }
      ]
    });
  };

  // Helper for rendering trend indicator
  const renderTrend = (value) => {
    const isPositive = Number(value) >= 0;
    return (
      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <i className={`fas ${isPositive ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
        <span>{Math.abs(value)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-dark tracking-tight">Tổng Quan Hệ Thống</h2>
          <p className="text-gray-500 mt-1 text-sm">Theo dõi chi tiết tình hình kinh doanh của bạn</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc thời gian */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="far fa-calendar-alt text-gray-400"></i>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none text-sm font-medium text-gray-700 cursor-pointer transition-all"
            >
              <option value="today">Hôm nay</option>
              <option value="7days">7 Ngày qua</option>
              <option value="thisMonth">Tháng này</option>
              <option value="thisYear">Năm nay</option>
              <option value="all">Toàn thời gian</option>
              <option value="custom">Tùy chọn khoảng ngày</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>

          {timeRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-gray-500">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <button 
                onClick={() => fetchStats()}
                disabled={!startDate || !endDate}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition"
              >
                Áp dụng
              </button>
            </div>
          )}

          <button 
            onClick={loadMockData}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm hover:bg-yellow-100 transition-colors text-sm font-medium text-yellow-700 cursor-pointer"
          >
            <i className="fas fa-magic"></i> Dữ liệu mẫu
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg shadow-sm hover:bg-green-100 transition-colors text-sm font-medium text-green-700 cursor-pointer"
          >
            <i className="fas fa-file-excel"></i> Xuất Excel
          </button>
          
          <button 
            onClick={() => fetchStats()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 cursor-pointer"
          >
            <i className={`fas fa-sync-alt text-primary ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isSales ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-5`}>
        {!isSales && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 text-xl shadow-inner border border-blue-200/50">
                <i className="fas fa-wallet"></i>
              </div>
              {renderTrend(stats.trends?.revenue || 0)}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Tổng Doanh Thu</p>
              <p className="text-2xl font-bold text-gray-900">{Number(stats.total_revenue).toLocaleString('vi-VN')}₫</p>
            </div>
          </div>
        )}
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center text-green-600 text-xl shadow-inner border border-green-200/50">
              <i className="fas fa-shopping-bag"></i>
            </div>
            {renderTrend(stats.trends?.orders || 0)}
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Số Đơn Hàng</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 text-xl shadow-inner border border-purple-200/50">
              <i className="fas fa-cubes"></i>
            </div>
            {renderTrend(stats.trends?.products || 0)}
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Tổng Sản Phẩm</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_products}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-orange-600 text-xl shadow-inner border border-orange-200/50">
              <i className="fas fa-user-friends"></i>
            </div>
            {renderTrend(stats.trends?.users || 0)}
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Khách Hàng</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
          </div>
        </div>
      </div>

      {/* ROW 3: Area Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Area Chart: Revenue Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Biến động {isSales ? 'Đơn hàng' : 'Doanh thu & Đơn hàng'}</h3>
            <div className="flex items-center gap-4 text-sm">
              {!isSales && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-gray-600">Doanh thu</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600">Đơn hàng</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatRevenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                {!isSales && (
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6b7280', fontSize: 12}}
                  />
                )}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6b7280', fontSize: 12}}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `${Number(value).toLocaleString('vi-VN')}₫` : value,
                    name === 'revenue' ? 'Doanh thu' : 'Đơn hàng'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                {!isSales && (
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{r: 6, strokeWidth: 0}} />
                )}
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" activeDot={{r: 6, strokeWidth: 0}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-4 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Trạng Thái Đơn Hàng</h3>
          <p className="text-sm text-gray-500 mb-4">Tỷ lệ các trạng thái đơn hiện tại</p>
          <div className="flex-1 w-full flex items-center justify-center min-h-[250px]">
            {formatStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    fill="#8884d8"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {formatStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl p-8">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Bar Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: Monthly Revenue */}
        {!isSales && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Doanh Thu Theo Tháng</h3>
            <div className="h-80 w-full">
              {formatMonthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatMonthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#6b7280', fontSize: 12}}
                    />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6', opacity: 0.5}}
                      formatter={(value) => [`${Number(value).toLocaleString('vi-VN')}₫`, 'Doanh thu']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {formatMonthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === formatMonthData.length - 1 ? '#4f46e5' : '#93c5fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                  Chưa có dữ liệu theo tháng
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOP PRODUCTS LIST */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Top Sản Phẩm Bán Chạy</h3>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Top 5</span>
          </div>
          
          {stats.top_products && stats.top_products.length > 0 ? (
            <div className="space-y-6 flex-1 mt-2">
              {stats.top_products.map((product, index) => {
                const maxSold = Math.max(...stats.top_products.map(p => Number(p.total_sold)));
                const percentage = (Number(product.total_sold) / maxSold) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-4 group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 transition-all shadow-sm ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-300/50' :
                      index === 1 ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 border border-gray-300/50' :
                      index === 2 ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 border border-orange-300/50' :
                      'bg-gray-50 text-gray-500 border border-gray-200/50'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1.5">
                        <p className="text-sm font-semibold text-gray-800 truncate pr-2 group-hover:text-primary transition-colors">{product.name}</p>
                        <p className="text-sm font-bold text-gray-700 shrink-0">{product.total_sold}</p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                            index === 0 ? 'bg-yellow-400' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-400' :
                            'bg-blue-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* RECENT ORDERS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-transparent">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Đơn Hàng Gần Đây</h3>
            <p className="text-sm text-gray-500 mt-0.5">Danh sách các giao dịch mới nhất trong hệ thống</p>
          </div>
          <Link to="/admin/orders" className="text-sm text-primary hover:text-primary-dark font-medium px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer">
            Xem tất cả
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/50">
                <th className="px-6 py-4 font-semibold">Mã Đơn</th>
                <th className="px-6 py-4 font-semibold">Khách Hàng</th>
                <th className="px-6 py-4 font-semibold">Ngày Đặt</th>
                <th className="px-6 py-4 font-semibold">Thanh Toán</th>
                <th className="px-6 py-4 font-semibold text-right">Tổng Tiền</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(stats.recent_orders || []).length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-xl m-4">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              ) : (
                stats.recent_orders.map(order => (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.order_code}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                          {order.shipping_name ? order.shipping_name.charAt(0) : '?'}
                        </div>
                        <span className="font-medium text-gray-700">{order.shipping_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.payment_method === 'vnpay' ? (
                          <span className="w-6 h-4 bg-blue-100 rounded text-[8px] font-bold text-blue-700 flex items-center justify-center">VN</span>
                        ) : order.payment_method === 'momo' ? (
                          <span className="w-6 h-4 bg-pink-100 rounded text-[8px] font-bold text-pink-700 flex items-center justify-center">MM</span>
                        ) : (
                          <span className="w-6 h-4 bg-green-100 rounded text-[8px] font-bold text-green-700 flex items-center justify-center"><i className="fas fa-money-bill"></i></span>
                        )}
                        <span className="text-gray-600 text-sm">{paymentMethodTranslations[order.payment_method] || order.payment_method || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-right">{Number(order.final_amount).toLocaleString('vi-VN')}₫</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold inline-block shadow-sm ${
                        order.order_status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        order.order_status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                        order.order_status === 'returned' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {statusTranslations[order.order_status] || (order.order_status ? order.order_status.toUpperCase() : 'N/A')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
