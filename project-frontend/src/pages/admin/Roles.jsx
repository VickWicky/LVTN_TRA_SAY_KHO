import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create"); // 'create' | 'edit'
  const [formData, setFormData] = useState({
    name: "",
    permissions: [],
  });
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const CORE_ROLES = ["admin", "warehouse", "sales"];

  const fetchRolesAndPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [resRoles, resPerms] = await Promise.all([
        fetch(`${API_URL}/api/admin/roles`, { headers }),
        fetch(`${API_URL}/api/admin/permissions`, { headers }),
      ]);

      if (resRoles.ok && resPerms.ok) {
        const rolesData = await resRoles.json();
        setRoles(rolesData.filter((r) => r.name !== "customer"));
        setPermissions(await resPerms.json());
      } else {
        toast.error("Lỗi tải dữ liệu phân quyền.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi kết nối máy chủ.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setFormData({ name: "", permissions: [] });
    setSelectedRoleId(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (role) => {
    setDrawerMode("edit");
    setFormData({
      name: role.name,
      permissions: role.permissions.map((p) => p.name),
    });
    setSelectedRoleId(role.id);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  const handleCheckboxChange = (permName) => {
    setFormData((prev) => {
      if (prev.permissions.includes(permName)) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p !== permName),
        };
      } else {
        return { ...prev, permissions: [...prev.permissions, permName] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên vai trò.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url =
        drawerMode === "create"
          ? `${API_URL}/api/admin/roles`
          : `${API_URL}/api/admin/roles/${selectedRoleId}`;

      const method = drawerMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(
          drawerMode === "create"
            ? "Tạo vai trò thành công!"
            : "Cập nhật vai trò thành công!",
        );
        closeDrawer();
        fetchRolesAndPermissions();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Lỗi xử lý hệ thống.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi kết nối.");
    }
  };

  const handleDelete = async (roleId, roleName) => {
    if (CORE_ROLES.includes(roleName)) {
      toast.warning("Không thể xóa vai trò mặc định của hệ thống.");
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa vai trò "${roleName}" không?`))
      return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/roles/${roleId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success("Xóa vai trò thành công.");
        fetchRolesAndPermissions();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Lỗi xóa vai trò.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi kết nối.");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Quản Lý Vai Trò
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Cấu hình phân quyền chi tiết cho nhân viên
          </p>
        </div>
        <button
          onClick={openCreateDrawer}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <i className="fas fa-plus"></i>
          Tạo Vai Trò Mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                  <th className="py-4 px-6 font-semibold">Tên Vai Trò</th>
                  <th className="py-4 px-6 font-semibold text-center">
                    Người Dùng
                  </th>
                  <th className="py-4 px-6 font-semibold">
                    Các Quyền (Permissions)
                  </th>
                  <th className="py-4 px-6 font-semibold text-right">
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr
                    key={role.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-800">
                        {role.name}
                      </span>
                      {CORE_ROLES.includes(role.name) && (
                        <span className="ml-2 text-[10px] text-red-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          Mặc định
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {role.users_count}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {role.name === "admin" ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">
                            Full Quyền
                          </span>
                        ) : role.permissions.length > 0 ? (
                          role.permissions.slice(0, 4).map((p) => (
                            <span
                              key={p.id}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100"
                            >
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">
                            Không có quyền
                          </span>
                        )}
                        {role.permissions.length > 4 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            +{role.permissions.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditDrawer(role)}
                          className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(role.id, role.name)}
                          disabled={CORE_ROLES.includes(role.name)}
                          className={`p-2 rounded-lg transition-colors ${
                            CORE_ROLES.includes(role.name)
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                          title="Xóa"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          />

          <div className="fixed inset-y-0 right-0 w-full max-w-md flex">
            <div className="w-full h-full bg-white shadow-2xl flex flex-col transform transition-transform">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">
                  {drawerMode === "create"
                    ? "Thêm Vai Trò Mới"
                    : "Cập Nhật Phân Quyền"}
                </h3>
                <button
                  onClick={closeDrawer}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form
                  id="roleForm"
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên Vai Trò
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={
                        drawerMode === "edit" &&
                        ["admin", "customer"].includes(formData.name)
                      }
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                        drawerMode === "edit" &&
                        ["admin", "customer"].includes(formData.name)
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    {drawerMode === "edit" &&
                      ["admin", "customer"].includes(formData.name) && (
                        <p className="text-xs text-amber-600 mt-1">
                          <i className="fas fa-info-circle"></i> Tên vai trò mặc
                          định không thể thay đổi.
                        </p>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Gán Quyền Hạn (Permissions)
                    </label>
                    {formData.name === "admin" ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        <i className="fas fa-shield-alt mr-2"></i> Role{" "}
                        <b>admin</b> mặc định có toàn quyền.
                      </div>
                    ) : (
                      <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 h-96 overflow-y-auto">
                        {permissions.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-start gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                          >
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(p.name)}
                                onChange={() => handleCheckboxChange(p.name)}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {p.name}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  form="roleForm"
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
                >
                  {drawerMode === "create" ? "Tạo Vai Trò" : "Lưu Thay Đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
