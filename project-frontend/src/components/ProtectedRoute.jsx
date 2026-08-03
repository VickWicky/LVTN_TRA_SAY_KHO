import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * ProtectedRoute — Bảo vệ route theo auth & role
 *
 * Cách dùng:
 *   <ProtectedRoute>                              → Chỉ cần đăng nhập
 *   <ProtectedRoute requireAdminPanel={true}>   → Cần đăng nhập + có role thuộc nhóm nhân viên (khác 'user')
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAdminPanel,
}) {
  const { isLoggedIn, roles, isLoading } = useAuth();

  // Đang tải thông tin user — hiện loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập → chuyển về trang login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập nhưng không đủ quyền (dựa theo allowedRoles cụ thể nếu có)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((role) => roles.includes(role));
    if (!hasRole) {
      return renderAccessDenied();
    }
  }

  // Đã đăng nhập nhưng cố vào trang Admin khi chỉ có mỗi role 'user'
  if (requireAdminPanel) {
    // Yêu cầu quyền admin hoặc staff để vào trang quản trị
    const hasAdminOrStaff =
      roles.includes("admin") ||
      roles.includes("warehouse") ||
      roles.includes("sales");
    if (!hasAdminOrStaff) {
      return renderAccessDenied();
    }
  }

  return children;
}

function renderAccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-shield-alt text-red-500 text-3xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">403</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Không có quyền truy cập
        </h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên
          nếu bạn cho rằng đây là lỗi.
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition shadow-md"
          >
            <i className="fas fa-home mr-2"></i>Về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
