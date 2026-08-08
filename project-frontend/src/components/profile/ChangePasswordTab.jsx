export default function ChangePasswordTab({
  user,
  passwordData,
  setPasswordData,
  handleChangePassword,
  isChangingPassword,
}) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
      <h2 className="text-2xl font-bold text-dark mb-6">Đổi Mật Khẩu</h2>
      {user.google_id && !user.password ? (
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex items-center gap-3">
          <i className="fas fa-exclamation-triangle"></i>
          <p>
            Tài khoản của bạn được liên kết bằng Google nên không có mật khẩu.
            Bạn không thể thực hiện chức năng này.
          </p>
        </div>
      ) : (
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">
              Mật Khẩu Hiện Tại
            </label>
            <input
              type="password"
              value={passwordData.current_password}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  current_password: e.target.value,
                })
              }
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">
              Mật Khẩu Mới
            </label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  new_password: e.target.value,
                })
              }
              required
              minLength="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">
              Xác Nhận Mật Khẩu Mới
            </label>
            <input
              type="password"
              value={passwordData.confirm_new_password}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirm_new_password: e.target.value,
                })
              }
              required
              minLength="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
            />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white font-semibold py-3 px-6 rounded-lg transition shadow-md cursor-pointer"
            >
              {isChangingPassword ? "Đang xử lý..." : "Xác Nhận Đổi"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
