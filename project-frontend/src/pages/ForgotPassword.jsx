import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // BƯỚC 1: GỬI OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setStep(2);
      } else {
        toast.error(data.message || "Lỗi khi gửi yêu cầu.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // BƯỚC 2: RESET MẬT KHẨU
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        navigate("/login");
      } else {
        toast.error(data.message || "Lỗi khi đặt lại mật khẩu.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-bglight py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg relative overflow-hidden">
        {/* Nút quay lại */}
        <Link
          to="/login"
          className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-500 transition-colors"
          title="Quay lại Đăng nhập"
        >
          <i className="fas fa-arrow-left"></i>
        </Link>

        <div className="text-center mb-8 mt-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            {step === 1 ? (
              <i className="fas fa-unlock-alt"></i>
            ) : (
              <i className="fas fa-shield-alt"></i>
            )}
          </div>
          <h2 className="text-3xl font-bold text-dark mb-2">
            Quên Mật Khẩu
          </h2>
          <p className="text-light text-sm">
            {step === 1
              ? "Nhập email của bạn để nhận mã xác thực (OTP)"
              : "Nhập mã OTP và thiết lập mật khẩu mới"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Email đã đăng ký
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Ví dụ: email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Đang gửi...
                </>
              ) : (
                "Nhận mã xác thực OTP"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in-up">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Mã xác thực (OTP)
              </label>
              <input
                type="text"
                required
                maxLength="6"
                className="w-full px-4 py-3 text-center tracking-widest text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Mã OTP 6 số đã được gửi đến: <span className="font-semibold text-gray-700">{email}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập mật khẩu mới (Ít nhất 6 ký tự)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !otp || !newPassword || !confirmPassword}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                </>
              ) : (
                "Đặt lại mật khẩu"
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isLoading}
              className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700 transition py-2"
            >
              Tôi muốn đổi email khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
