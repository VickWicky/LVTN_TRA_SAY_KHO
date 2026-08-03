import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";

export default function Contact() {
  const { settings } = useSettings();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (/\d/.test(formData.name)) {
      toast.error("Họ và tên không được chứa ký tự số!");
      return;
    }
    if (formData.message.trim().length < 20) {
      toast.error("Nội dung liên hệ phải có ít nhất 20 ký tự!");
      return;
    }

    try {
      setIsSubmitting(true);
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/api/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          "Cảm ơn bạn đã gửi thông tin. Chúng tôi sẽ phản hồi trong thời gian sớm nhất!",
        );
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Có lỗi xảy ra khi gửi liên hệ.");
      }
    } catch (error) {
      console.error("Lỗi khi gửi liên hệ:", error);
      toast.error("Không thể kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <section className="bg-gradient-to-br from-primary to-primary-light text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-7xl">
          <h1 className="text-4xl font-bold mb-3">Liên Hệ Với Chúng Tôi</h1>
          <p className="text-lg opacity-90">
            Chúng tôi luôn sẵn sàng lắng nghe ý kiến của bạn
          </p>
        </div>
      </section>

      {/* CONTACT CONTENT */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* FORM LIÊN HỆ */}
            <div className="bg-bglight p-8 rounded-xl shadow-sm">
              <h2 className="text-2xl font-bold text-dark mb-6">
                Gửi Thông Tin Phản Hồi
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên của bạn"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary bg-white transition"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Nhập email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary bg-white transition"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Điện Thoại
                    </label>
                    <input
                      type="tel"
                      placeholder="Nhập số điện thoại"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary bg-white transition"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Chủ Đề
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Chủ đề liên hệ"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary bg-white transition"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Nội Dung
                  </label>
                  <textarea
                    rows="5"
                    required
                    placeholder="Viết nội dung liên hệ của bạn (tối thiểu 20 ký tự)..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary bg-white transition"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md flex items-center justify-center gap-2 hover:cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Đang gửi...
                    </>
                  ) : (
                    <>
                      Gửi Yêu Cầu <i className="fas fa-paper-plane"></i>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="flex flex-col justify-center space-y-8 pl-0 lg:pl-6">
              <div>
                <h2 className="text-2xl font-bold text-dark mb-6">
                  Thông Tin Chi Tiết
                </h2>
              </div>

              {settings.branches && settings.branches.length > 0 ? (
                settings.branches.map((branch, index) => (
                  <div key={index} className="flex gap-4 items-start mb-6">
                    <div className="text-2xl text-primary p-3 bg-bglight rounded-lg">
                      📍
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-dark mb-1">
                        {branch.name}
                      </h3>
                      <p className="text-light text-sm">{branch.address}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-4 items-start mb-6">
                  <div className="text-2xl text-primary p-3 bg-bglight rounded-lg">
                    📍
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-dark mb-1">
                      Trụ Sở Chính
                    </h3>
                    <p className="text-light text-sm">
                      123 Đường Trà Sấy, Quận Ba Đình, Hà Nội
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 items-start mb-6">
                <div className="text-2xl text-primary p-3 bg-bglight rounded-lg">
                  📞
                </div>
                <div>
                  <h3 className="font-bold text-lg text-dark mb-1">
                    Điện Thoại
                  </h3>
                  <p className="text-light text-sm">
                    {settings.contact_phone || "0123 456 789"}
                  </p>
                  <p className="text-light text-xs">
                    Hotline phục vụ: 8h - 22h tất cả các ngày
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start mb-6">
                <div className="text-2xl text-primary p-3 bg-bglight rounded-lg">
                  ✉️
                </div>
                <div>
                  <h3 className="font-bold text-lg text-dark mb-1">Email</h3>
                  <p className="text-light text-sm">
                    {settings.contact_email || "hello@cktea.vn"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="text-2xl text-primary p-3 bg-bglight rounded-lg">
                  🕒
                </div>
                <div>
                  <h3 className="font-bold text-lg text-dark mb-1">
                    Giờ Mở Cửa
                  </h3>
                  <p className="text-light text-sm">
                    Thứ 2 - Thứ 6: 8:00 - 18:00
                  </p>
                  <p className="text-light text-sm">
                    Thứ 7 - Chủ Nhật: 9:00 - 17:00
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
