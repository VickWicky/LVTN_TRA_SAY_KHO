export default function UserInfoTab({
  user,
  formData,
  setFormData,
  handleUpdateProfile,
  isUpdating,
}) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
      <h2 className="text-2xl font-bold text-dark mb-6">Thông Tin Cá Nhân</h2>
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">
              Họ và Tên
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">
              Số Điện Thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="Chưa cập nhật"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark mb-2">
            Email
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
          />
          {user.google_id && (
            <p className="text-xs text-primary mt-1 font-semibold">
              <i className="fab fa-google"></i> Tài khoản liên kết với Google
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark mb-2">
            Địa Chỉ Giao Hàng Mặc Định
          </label>
          <textarea
            rows="3"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="Nhập địa chỉ nhận hàng của bạn..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white"
          ></textarea>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isUpdating}
            className="bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white font-semibold py-3 px-6 rounded-lg transition shadow-md cursor-pointer"
          >
            {isUpdating ? "Đang cập nhật..." : "Cập Nhật Thông Tin"}
          </button>
        </div>
      </form>
    </div>
  );
}
