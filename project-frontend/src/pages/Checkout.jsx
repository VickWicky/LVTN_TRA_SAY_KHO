import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils";
import { useCart } from "../contexts/CartContext";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();

  const [formData, setFormData] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    payment_method: "cod",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Thử lấy thông tin user nếu đã đăng nhập để điền sẵn form
  useEffect(() => {
    const savedFormData = sessionStorage.getItem("checkoutFormData");
    if (savedFormData) {
      setFormData(JSON.parse(savedFormData));
      sessionStorage.removeItem("checkoutFormData");
      return;
    }

    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/user`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            const userData = data.user;
            setFormData((prev) => ({
              ...prev,
              shipping_name: userData.name || "",
              shipping_phone: userData.phone || "",
              shipping_address: userData.address || "",
            }));
          }
        } catch (err) {
          console.error("Không thể lấy thông tin user:", err);
        }
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setError("Giỏ hàng của bạn đang trống!");
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.shipping_phone)) {
      setError("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số.");
      return;
    }

    if (formData.shipping_address.trim().length < 15) {
      setError(
        "Địa chỉ quá ngắn. Vui lòng nhập đầy đủ Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      ...formData,
      items: cartItems.map((item) => ({
        variant_id: item.variant.id,
        quantity: item.quantity,
      })),
    };

    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        clearCart();

        if (formData.payment_method === "vnpay") {
          try {
            const vnpayRes = await fetch(
              `${API_URL}/api/payment/vnpay/create-url`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({ order_id: data.order.id }),
              },
            );
            const vnpayData = await vnpayRes.json();
            if (vnpayRes.ok && vnpayData.vnpay_url) {
              window.location.href = vnpayData.vnpay_url;
              return;
            } else {
              toast.error(
                "Lỗi khi tạo giao dịch VNPAY. Đơn hàng đã chuyển về dạng thanh toán sau.",
              );
            }
          } catch (e) {
            console.error("Lỗi VNPAY:", e);
            toast.error(
              "Không thể kết nối đến cổng thanh toán. Đơn hàng đã chuyển về dạng thanh toán sau.",
            );
          }
        }

        if (token) {
          toast.success("Đặt hàng thành công! ");
          navigate("/profile?tab=orders");
        } else {
          toast.success(
            "Đặt hàng thành công! Nhân viên sẽ liên hệ với bạn sớm nhất có thể.",
          );
          navigate("/");
        }
      } else {
        setError(data.message || "Có lỗi xảy ra khi đặt hàng.");
      }
    } catch (err) {
      console.error(err);
      setError("Không thể kết nối đến server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng của bạn đang trống</h2>
        <button
          onClick={() => navigate("/products")}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl py-12 flex-grow animate-fade-in">
      <h1 className="text-3xl font-bold text-dark mb-8 border-b pb-4">
        Thanh Toán
      </h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Form Recipient Information*/}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-dark mb-6">
            Thông Tin Người Nhận
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Họ và Tên *
              </label>
              <input
                type="text"
                name="shipping_name"
                value={formData.shipping_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập họ tên người nhận"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Số Điện Thoại *
              </label>
              <input
                type="tel"
                name="shipping_phone"
                value={formData.shipping_phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Địa Chỉ Nhận Hàng *
              </label>
              <textarea
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                required
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
                placeholder="Nhập chi tiết địa chỉ (Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố)"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Phương Thức Thanh Toán
              </label>

              <div className="space-y-3">
                <label
                  className={`border rounded-lg p-4 flex items-center justify-between cursor-pointer transition ${formData.payment_method === "cod" ? "border-primary bg-primary-light/5" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={formData.payment_method === "cod"}
                      onChange={handleChange}
                      className="text-primary w-4 h-4 focus:ring-primary"
                    />
                    <span className="font-semibold text-dark">
                      Thanh toán khi nhận hàng (COD)
                    </span>
                  </div>
                  <i className="fas fa-money-bill-wave text-green-600 text-xl"></i>
                </label>

                <label
                  className={`border rounded-lg p-4 flex flex-col justify-between transition ${formData.payment_method === "vnpay" ? "border-primary bg-primary-light/5" : "border-gray-300 bg-white hover:bg-gray-50"} ${!localStorage.getItem("token") ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        value="vnpay"
                        checked={formData.payment_method === "vnpay"}
                        onChange={handleChange}
                        disabled={!localStorage.getItem("token")}
                        className="text-primary w-4 h-4 focus:ring-primary disabled:cursor-not-allowed"
                      />
                      <span className="font-semibold text-dark">
                        Thanh toán trực tuyến bằng VNPAY
                      </span>
                    </div>
                    <div className="font-bold text-blue-600 italic">VNPAY</div>
                  </div>
                  {!localStorage.getItem("token") && (
                    <p className="text-xs text-red-500 mt-2 ml-7">
                      * Vui lòng{" "}
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(
                            "checkoutFormData",
                            JSON.stringify(formData),
                          );
                          navigate("/login", {
                            state: { returnTo: "/checkout" },
                          });
                        }}
                        className="underline font-bold text-primary cursor-pointer hover:text-primary-dark"
                      >
                        đăng nhập
                      </button>{" "}
                      để sử dụng tính năng thanh toán trực tuyến.
                    </p>
                  )}
                </label>
              </div>
            </div>

            <div className="pt-6 border-t mt-8">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-md flex items-center justify-center gap-2 ${
                  isLoading
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-dark hover:-translate-y-1 cursor-pointer"
                }`}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i> Xác Nhận Đặt Hàng
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 h-fit sticky top-24">
          <h2 className="text-xl font-bold text-dark mb-6">Đơn Hàng Của Bạn</h2>

          <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {cartItems.map((item, index) => {
              const price =
                item.variant.sale_price > 0
                  ? item.variant.sale_price
                  : item.variant.price;
              return (
                <div
                  key={index}
                  className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                    <img
                      src={getImageUrl(item.product.thumbnail)}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-dark text-sm line-clamp-1">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Loại: {item.variant.weight}g
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-semibold text-gray-700">
                        SL: x{item.quantity}
                      </span>
                      <span className="text-primary font-bold text-sm">
                        {(price * item.quantity).toLocaleString()}₫
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tạm tính</span>
              <span className="font-semibold">
                {cartTotal.toLocaleString()}₫
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold text-dark pt-3 border-t border-gray-200 mt-2">
              <span>Tổng cộng</span>
              <span className="text-2xl text-primary">
                {cartTotal.toLocaleString()}₫
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
