import { toast } from "react-toastify";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Lỗi: Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0][0];
          throw new Error(firstError);
        }
        throw new Error(data.message || "Có lỗi xảy ra!");
      }

      if (data.require_otp) {
        toast.success(data.message);
        setStep(2);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Mã OTP phải bao gồm 6 chữ số!");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Mã OTP không chính xác!");
      }

      toast.success(data.message || "Đăng ký thành công!");
      navigate("/login");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-bglight py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark mb-2">Tạo Tài Khoản</h2>
          <p className="text-light text-sm">
            {step === 1
              ? "Trở thành thành viên của CK Tea ngay hôm nay"
              : "Xác thực địa chỉ Email của bạn"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Họ và Tên
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark mb-2">
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                  placeholder="0987654321"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Mật Khẩu
              </label>
              <input
                type="password"
                required
                minLength="6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                placeholder="Ít nhất 6 ký tự"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Xác Nhận Mật Khẩu
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition shadow-md mt-4 cursor-pointer ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? "Đang xử lý..." : "Đăng Ký"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm mb-4">
              Chúng tôi đã gửi một mã OTP gồm 6 chữ số đến email{" "}
              <strong>{formData.email}</strong>. Vui lòng kiểm tra hộp thư (bao
              gồm cả mục Spam).
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark mb-2 text-center">
                Nhập mã OTP
              </label>
              <input
                type="text"
                required
                maxLength="6"
                className="w-full px-4 py-4 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))} // Chỉ cho phép nhập số
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={`w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition shadow-md mt-4 cursor-pointer ${loading || otp.length !== 6 ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? "Đang xác thực..." : "Xác Thực Tài Khoản"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full mt-2 text-primary text-sm hover:underline"
            >
              Quay lại điền thông tin
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="mt-6 text-center text-sm text-light">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary hover:text-primary-dark transition"
            >
              Đăng nhập
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
