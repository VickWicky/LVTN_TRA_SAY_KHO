import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Products from './pages/Products';
import About from './pages/About';
import Contact from './pages/Contact';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import PaymentReturn from './pages/PaymentReturn';

import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminCategories from './pages/admin/Categories';
import AdminOrders from './pages/admin/Orders';
import AdminInventory from './pages/admin/Inventory';
import AdminExportInventory from './pages/admin/ExportInventory';
import AdminContacts from './pages/admin/Contacts';
import AdminSuppliers from './pages/admin/Suppliers';
import AdminPromotions from './pages/admin/Promotions';
import AdminBanners from './pages/admin/Banners';
import AdminSettings from './pages/admin/Settings';
import AdminAccounts from './pages/admin/Accounts';
import AdminRoles from './pages/admin/Roles';

function App() {
  useEffect(() => {
    const welcomeMsg = localStorage.getItem('welcomeMessage');
    if (welcomeMsg) {
      toast.success(welcomeMsg);
      localStorage.removeItem('welcomeMessage');
    }
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer 
        position="top-right" // Hiện ở góc trên bên phải
        autoClose={3000} // Tự động tắt sau 3 giây
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        theme="light"
      />
      <Routes>
        {/* Layout sẽ bọc bên ngoài tất cả các trang */}
        <Route path="/" element={<Layout />}>
          {/* Trang chủ */}
          <Route index element={<Home />} />
          
          {/* Các trang công khai */}
          <Route path="about" element={<About />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="payment/vnpay-return" element={<PaymentReturn />} />

          {/* Trang cần đăng nhập (bất kỳ role nào) */}
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Route>

        {/* Các trang dành cho Admin/Staff/Sales — bảo vệ bằng ProtectedRoute + role */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'staff', 'sales']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="inventory-logs" element={<AdminExportInventory />} />
          <Route path="contacts" element={<AdminContacts />} />
          <Route path="suppliers" element={<AdminSuppliers />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="roles" element={<AdminRoles />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;