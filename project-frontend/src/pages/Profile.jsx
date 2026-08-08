import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import UserInfoTab from "../components/profile/UserInfoTab";
import ChangePasswordTab from "../components/profile/ChangePasswordTab";
import OrdersTab from "../components/profile/OrdersTab";
import WishlistTab from "../components/profile/WishlistTab";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["info", "password", "orders", "wishlist"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.removeItem("isLoggedIn");
        window.location.href = "/login";
        return;
      }

      try {
        const [userRes, orderRes] = await Promise.all([
          fetch(`${API_URL}/api/user`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/api/user/orders`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          const userData = data.user;
          setUser(userData);
          setFormData({
            name: userData.name || "",
            phone: userData.phone || "",
            address: userData.address || "",
          });
        } else {
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("token");
          window.location.href = "/login";
        }

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrders(orderData);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu User:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        toast.success("Cập nhật thông tin thành công!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Lỗi khi cập nhật thông tin");
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể kết nối đến máy chủ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_new_password) {
      toast.error("Mật khẩu mới không khớp!");
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setIsChangingPassword(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Đổi mật khẩu thành công!");
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_new_password: "",
        });
      } else {
        toast.error(data.message || "Lỗi khi đổi mật khẩu");
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể kết nối đến máy chủ");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xl font-bold text-primary">
        Đang tải thông tin...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 max-w-7xl py-12 flex-grow">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* CỘT TRÁI: MENU ĐIỀU HƯỚNG */}
        <div className="bg-bglight p-6 rounded-xl h-fit">
          <div className="text-center mb-6 border-b border-gray-200 pb-6">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full mx-auto mb-3 object-cover shadow-sm border-2 border-primary"
              />
            ) : (
              <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center text-4xl text-primary shadow-sm mb-3">
                <i className="fas fa-user"></i>
              </div>
            )}

            <h2 className="text-xl font-bold text-dark">{user.name}</h2>
            <p className="text-light text-sm">{user.email}</p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("info")}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === "info"
                  ? "bg-white text-primary shadow-sm"
                  : "text-dark hover:bg-white hover:text-primary"
              }`}
            >
              <i className="fas fa-user w-6"></i> Thông tin cá nhân
            </button>

            <button
              onClick={() => setActiveTab("password")}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === "password"
                  ? "bg-white text-primary shadow-sm"
                  : "text-dark hover:bg-white hover:text-primary"
              }`}
            >
              <i className="fas fa-key w-6"></i> Đổi mật khẩu
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === "orders"
                  ? "bg-white text-primary shadow-sm"
                  : "text-dark hover:bg-white hover:text-primary"
              }`}
            >
              <i className="fas fa-box w-6"></i> Đơn hàng của tôi
            </button>

            <button
              onClick={() => setActiveTab("wishlist")}
              className={`w-full text-left px-4 py-3 font-semibold rounded-lg transition ${
                activeTab === "wishlist"
                  ? "bg-white text-red-500 shadow-sm"
                  : "text-dark hover:bg-white hover:text-red-500"
              }`}
            >
              <i className="fas fa-heart w-6"></i> Danh sách yêu thích
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 mt-4 text-accent hover:bg-red-50 font-semibold rounded-lg transition"
            >
              <i className="fas fa-sign-out-alt w-6"></i> Đăng xuất
            </button>
          </nav>
        </div>

        {/* CỘT PHẢI: KHU VỰC HIỂN THỊ */}
        <div className="md:col-span-3">
          {activeTab === "info" && (
            <UserInfoTab
              user={user}
              formData={formData}
              setFormData={setFormData}
              handleUpdateProfile={handleUpdateProfile}
              isUpdating={isUpdating}
            />
          )}

          {activeTab === "password" && (
            <ChangePasswordTab
              user={user}
              passwordData={passwordData}
              setPasswordData={setPasswordData}
              handleChangePassword={handleChangePassword}
              isChangingPassword={isChangingPassword}
            />
          )}

          {activeTab === "orders" && (
            <OrdersTab orders={orders} setOrders={setOrders} />
          )}

          {activeTab === "wishlist" && <WishlistTab />}
        </div>
      </div>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-dark mb-4">
              Xác nhận đăng xuất
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
