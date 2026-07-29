import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import CartSidebar from './CartSidebar';
import ChatWidget from './Chatbot/ChatWidget';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { removeVietnameseTones } from '../utils';

export default function Layout() {
  const { cartCount } = useCart();
  const { isLoggedIn, isAdminOrStaff, isLoading, logout } = useAuth();
  const { settings } = useSettings();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();

  const [suggestedKeywords, setSuggestedKeywords] = useState([]);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/products');
        if (res.ok) {
          const data = await res.json();
          // Lấy danh sách tên sản phẩm làm từ khóa, giới hạn 15 từ khóa
          const keywords = data.map(p => p.name).slice(0, 15);
          setSuggestedKeywords(keywords);
        }
      } catch (error) {
        console.error('Lỗi khi lấy từ khóa gợi ý:', error);
      }
    };
    fetchKeywords();
  }, []);

  const normalizedSearchInput = removeVietnameseTones(searchInput).toLowerCase();
  const filteredSuggestions = suggestedKeywords.filter(kw => 
    removeVietnameseTones(kw).toLowerCase().includes(normalizedSearchInput)
  ).slice(0, 8);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchInput.trim())}`);
      setIsSearchFocused(false);
      setSearchInput('');
    }
  };

  const handleSuggestionClick = (kw) => {
    navigate(`/products?search=${encodeURIComponent(kw)}`);
    setSearchInput('');
    setIsSearchFocused(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-dark bg-white">
      {/* HEADER */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/" className="text-2xl font-bold text-primary hover:text-primary-light transition">
            {settings.store_name || 'CK Tea'}
          </Link>

          <nav className="hidden md:flex gap-8 font-semibold">
            <Link to="/" className="hover:text-primary transition border-b-2 border-transparent hover:border-primary">Trang Chủ</Link>
            <Link to="/about" className="hover:text-primary transition border-b-2 border-transparent hover:border-primary">Giới Thiệu</Link>
            <Link to="/products" className="hover:text-primary transition border-b-2 border-transparent hover:border-primary">Sản Phẩm</Link>
            <Link to="/contact" className="hover:text-primary transition border-b-2 border-transparent hover:border-primary">Liên Hệ</Link>
          </nav>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="flex items-center bg-bglight rounded-lg px-3 py-2 border border-transparent focus-within:border-primary/30 transition-colors">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm trà..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="bg-transparent border-none outline-none text-sm w-40 lg:w-48" 
                />
                <button type="submit" className="text-light hover:text-primary cursor-pointer"><i className="fas fa-search"></i></button>
              </form>

              {/* Drowdown gợi ý từ khóa */}
              {isSearchFocused && searchInput.trim().length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-[100] animate-fade-in">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                    Gợi ý tìm kiếm
                  </div>
                  {filteredSuggestions.map((kw, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleSuggestionClick(kw)}
                      className="px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary cursor-pointer flex items-center gap-2 transition-colors"
                    >
                      <i className="fas fa-search text-gray-400 text-xs"></i>
                      <span>{kw}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LOGIC ĐĂNG NHẬP Ở ĐÂY */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin hidden sm:block"></div>
            ) : isLoggedIn ? (
              <>
                {/* Nút Quản trị — chỉ hiện cho admin/staff */}
                {isAdminOrStaff && (
                  <Link to="/admin" className="hidden sm:flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-lg font-semibold transition text-sm" title="Trang Quản trị">
                    <i className="fas fa-cog text-xs"></i> Quản trị
                  </Link>
                )}
                <Link to="/profile" className="relative text-xl text-dark hover:text-primary transition cursor-pointer" title="Hồ sơ cá nhân">
                  <i className="fas fa-user-circle text-2xl text-primary"></i>
                </Link>
              </>
            ) : (
              <Link to="/login" className="hidden sm:block bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition text-sm">
                Đăng Nhập
              </Link>
            )}

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative text-xl text-dark hover:text-primary transition cursor-pointer ml-2">
              <i className="fas fa-shopping-cart"></i>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {isLoggedIn && !isLoading && (
              <button 
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="relative text-xl text-dark hover:text-red-500 transition cursor-pointer ml-1" 
                title="Đăng xuất"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* NỘI DUNG CÁC TRANG SẼ HIỂN THỊ Ở ĐÂY (Outlet) */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-primary-dark text-white pt-16 pb-6 mt-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="text-lg font-bold mb-4">Về {settings.store_name || 'CK Tea'}</h4>
              <p className="opacity-90 leading-relaxed text-sm">
                {settings.footer_description || 'Chuyên cung cấp trà sấy khô chất lượng cao, giữ trọn hương vị tự nhiên và dưỡng chất cho sức khỏe gia đình bạn.'}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">Liên Kết Nhanh</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link to="/" className="hover:underline">Trang Chủ</Link></li>
                <li><Link to="/products" className="hover:underline">Sản Phẩm</Link></li>
                <li><Link to="/about" className="hover:underline">Giới Thiệu</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">Liên Hệ</h4>
              {settings.branches && settings.branches.length > 0 ? (
                <p className="opacity-90 text-sm mb-2">📍 Trụ sở: {settings.branches[0].address}</p>
              ) : (
                <p className="opacity-90 text-sm mb-2">📍 Hà Nội, Việt Nam</p>
              )}
              <p className="opacity-90 text-sm mb-2">📞 {settings.contact_phone || '0123 456 789'}</p>
              <p className="opacity-90 text-sm">✉️ {settings.contact_email || 'hello@cktea.vn'}</p>
            </div>
          </div>
          <div className="text-center pt-6 border-t border-white/20 opacity-80 text-sm">
            &copy; {new Date().getFullYear()} {settings.store_name || 'CK Tea'}. Bảo lưu mọi quyền.
          </div>
        </div>
      </footer>
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
      <ChatWidget />
    </div>
  );
}