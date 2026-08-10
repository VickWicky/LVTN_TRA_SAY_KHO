import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRoles(data.roles || []);
        setPermissions(data.permissions || []);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("isLoggedIn");
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (tokenValue, userData, userRoles, userPermissions = []) => {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("isLoggedIn", "true");
    setUser(userData);
    setRoles(userRoles || []);
    setPermissions(userPermissions || []);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    setUser(null);
    setRoles([]);
    setPermissions([]);
  };

  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (user) {
        // 30 phút = 30 * 60 * 1000 = 1800000 ms
        timeoutId = setTimeout(() => {
          logout();
          toast.info(
            "Phiên đăng nhập đã hết hạn do bạn không hoạt động trong 30 phút. Vui lòng đăng nhập lại.",
          );
          // Redirect về login sau 2 giây
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        }, 1800000);
      }
    };

    if (user) {
      resetTimer();
      const events = [
        "mousemove",
        "keydown",
        "mousedown",
        "touchstart",
        "scroll",
      ];
      events.forEach((e) => window.addEventListener(e, resetTimer));

      return () => {
        clearTimeout(timeoutId);
        events.forEach((e) => window.removeEventListener(e, resetTimer));
      };
    }
  }, [user]);

  const isLoggedIn = !!user;
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");
  const isSales = roles.includes("sales");

  // Kiểm tra xem có role nào khác 'user' không
  const isAdminOrStaff =
    roles.includes("admin") ||
    roles.includes("staff") ||
    roles.includes("warehouse") ||
    roles.includes("sales");

  const hasAccountAccess =
    isAdmin ||
    permissions.includes("manage-users") ||
    permissions.includes("view-users");
  const canManageProducts = isAdmin || permissions.includes("manage-products");
  const canManageCategories =
    isAdmin || permissions.includes("manage-categories");
  const canManageOrders = isAdmin || permissions.includes("manage-orders");

  const value = {
    user,
    setUser,
    roles,
    permissions,
    isLoggedIn,
    isLoading,
    isAdmin,
    isStaff,
    isSales,
    isAdminOrStaff,
    hasAccountAccess,
    canManageProducts,
    canManageCategories,
    canManageOrders,
    login,
    logout,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
