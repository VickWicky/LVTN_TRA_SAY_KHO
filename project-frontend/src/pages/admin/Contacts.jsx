import { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Pagination from "../../components/admin/Pagination";
import ConfirmModal from "../../components/admin/ConfirmModal";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedContact, setSelectedContact] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchContacts = async (
    page = currentPage,
    search = debouncedSearch,
  ) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/admin/contacts?page=${page}&search=${encodeURIComponent(search)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setContacts(data.data || []);
        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
      } else {
        toast.error("Lỗi khi tải dữ liệu liên hệ.");
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      toast.error("Không thể kết nối đến máy chủ.");
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
  }, [searchTerm]);

  useEffect(() => {
    fetchContacts(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const handleUpdateStatus = async (id, newStatus) => {
    setOpenMenuId(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/contacts/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success("Cập nhật trạng thái thành công!");
        fetchContacts(currentPage, debouncedSearch);
        if (selectedContact && selectedContact.id === id) {
          setSelectedContact((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        toast.error("Lỗi khi cập nhật trạng thái.");
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
    setOpenMenuId(null);
  };

  const executeDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/contacts/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Xóa liên hệ thành công!");
        fetchContacts(currentPage, debouncedSearch);
        if (selectedContact && selectedContact.id === id) {
          setIsDrawerOpen(false);
        }
      } else {
        toast.error("Lỗi khi xóa liên hệ.");
      }
    } catch (error) {
      console.error("Lỗi xóa liên hệ:", error);
    }
  };

  const handleOpenDetails = (contact) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
    setOpenMenuId(null);
    if (contact.status === "new") {
      handleUpdateStatus(contact.id, "read");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "new":
        return (
          <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>{" "}
            Mới nhận
          </span>
        );
      case "read":
        return (
          <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <i className="fas fa-eye"></i> Đã xem
          </span>
        );
      case "resolved":
        return (
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <i className="fas fa-check-circle"></i> Đã xử lý
          </span>
        );
      default:
        return (
          <span className="bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Quản Lý Liên Hệ
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Hỗ trợ và phản hồi từ khách hàng
            </p>
          </div>
          <div className="w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Tìm tên khách hàng, email, chủ đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
        {isLoading && contacts.length === 0 ? (
          <div className="absolute inset-0 flex justify-center items-center bg-white/80 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <span className="text-gray-500 font-medium">
                Đang tải dữ liệu...
              </span>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-bold">Khách Hàng</th>
                <th className="p-4 font-bold w-1/3">Nội Dung</th>
                <th className="p-4 font-bold text-center w-36">Ngày Gửi</th>
                <th className="p-4 font-bold text-center w-36">Trạng Thái</th>
                <th className="p-4 font-bold text-center w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="far fa-envelope-open text-4xl mb-3 text-gray-300"></i>
                      <p className="text-base font-medium">
                        Chưa có liên hệ nào
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={`hover:bg-blue-50/30 transition-colors group ${contact.status === "new" ? "bg-blue-50/10" : ""}`}
                  >
                    <td className="p-4">
                      <div className="font-bold text-gray-900 text-sm mb-1">
                        {contact.name}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        <i className="fas fa-envelope text-gray-400 mr-1.5"></i>
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="text-xs text-gray-500 mt-1">
                          <i className="fas fa-phone-alt text-gray-400 mr-1.5"></i>
                          {contact.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div
                        className={`text-sm mb-1 line-clamp-1 ${contact.status === "new" ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}
                      >
                        {contact.subject}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {contact.message}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-xs font-semibold text-gray-800">
                        {new Date(contact.created_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(contact.created_at).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(contact.status)}
                      </div>
                    </td>
                    <td className="p-4 text-center relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === contact.id ? null : contact.id,
                          )
                        }
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center mx-auto"
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>

                      {openMenuId === contact.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-12 top-10 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-fade-in text-left"
                        >
                          <button
                            onClick={() => handleOpenDetails(contact)}
                            className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 font-medium transition-colors"
                          >
                            <i className="fas fa-expand-arrows-alt w-4"></i> Xem
                            chi tiết
                          </button>

                          <div className="border-t border-gray-100">
                            {contact.status !== "resolved" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(contact.id, "resolved")
                                }
                                className="w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 text-left flex items-center gap-3 font-medium transition-colors"
                              >
                                <i className="fas fa-check-double w-4"></i> Đánh
                                dấu đã xử lý
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(contact.id)}
                              className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-3 font-medium transition-colors border-t border-gray-100"
                            >
                              <i className="fas fa-trash-alt w-4"></i> Xóa bỏ
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {contacts.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* DRAWER XEM CHI TIẾT */}
      {isDrawerOpen && selectedContact && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-400"></div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="far fa-envelope-open text-primary"></i>
                  Nội Dung Phản Hồi
                </h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar space-y-6">
              {/* Status & Actions Control */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">
                    Trạng thái hiện tại:
                  </span>
                  {getStatusBadge(selectedContact.status)}
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedContact.id, "read")
                    }
                    disabled={selectedContact.status === "read"}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${selectedContact.status === "read" ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50 shadow-sm"}`}
                  >
                    <i className="fas fa-eye mr-1"></i> Đánh dấu Đã xem
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedContact.id, "resolved")
                    }
                    disabled={selectedContact.status === "resolved"}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${selectedContact.status === "resolved" ? "bg-emerald-50 text-emerald-500 border-emerald-200 cursor-not-allowed" : "bg-primary text-white border-primary hover:bg-primary-dark shadow-sm shadow-primary/30"}`}
                  >
                    <i className="fas fa-check mr-1"></i> Xử lý xong
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">
                  Thông tin người gửi
                </h4>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">
                      {selectedContact.name}
                    </p>
                    <div className="flex flex-col gap-1 mt-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-envelope w-4 text-center text-gray-400"></i>{" "}
                        {selectedContact.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-phone-alt w-4 text-center text-gray-400"></i>{" "}
                        {selectedContact.phone || (
                          <span className="italic text-gray-400">
                            Không cung cấp
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="far fa-clock w-4 text-center text-gray-400"></i>{" "}
                        {new Date(selectedContact.created_at).toLocaleString(
                          "vi-VN",
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Chủ đề
                  </h4>
                  <p className="font-bold text-gray-900 text-lg">
                    {selectedContact.subject}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Nội dung chi tiết
                  </h4>
                  <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                    {selectedContact.message}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        message="Bạn có chắc chắn muốn xóa liên hệ này?"
      />
    </div>
  );
}
