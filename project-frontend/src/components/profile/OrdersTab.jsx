import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useCart } from "../../contexts/CartContext";
import { getImageUrl } from "../../utils";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function OrdersTab({ orders, setOrders }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 5;

  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    orderId: null,
  });

  const [shippingModal, setShippingModal] = useState({
    isOpen: false,
    orderId: null,
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
  });

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const handleRetryPayment = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/payment/vnpay/create-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (res.ok && data.vnpay_url) {
        window.location.href = data.vnpay_url;
      } else {
        toast.error("Không thể tạo lại giao dịch VNPAY.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối.");
    }
  };

  const handleUpdateShipping = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/user/orders/${shippingModal.orderId}/shipping`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            shipping_name: shippingModal.shipping_name,
            shipping_phone: shippingModal.shipping_phone,
            shipping_address: shippingModal.shipping_address,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success("Cập nhật thông tin giao hàng thành công!");
        setOrders(
          orders.map((o) => (o.id === shippingModal.orderId ? data.order : o))
        );
        setShippingModal({
          isOpen: false,
          orderId: null,
          shipping_name: "",
          shipping_phone: "",
          shipping_address: "",
        });
      } else {
        toast.error(data.message || "Lỗi khi cập nhật thông tin");
      }
    } catch (error) {
      toast.error("Lỗi kết nối server");
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal.orderId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/user/orders/${cancelModal.orderId}/cancel`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Hủy đơn hàng thành công!");
        setOrders(
          orders.map((o) => (o.id === cancelModal.orderId ? data.order : o))
        );
      } else {
        toast.error(data.message || "Không thể hủy đơn hàng.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối.");
    } finally {
      setCancelModal({ isOpen: false, orderId: null });
    }
  };

  const handleBuyAgain = (order) => {
    if (!order.items || order.items.length === 0) {
      toast.error("Đơn hàng không có sản phẩm.");
      return;
    }

    order.items.forEach((item) => {
      if (item.variant && item.variant.product) {
        addToCart(item.variant.product, item.variant, item.quantity);
      }
    });

    toast.success("Đã thêm các sản phẩm vào giỏ hàng!");
    navigate("/checkout");
  };

  return (
    <>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
        <h2 className="text-2xl font-bold text-dark mb-6">Lịch Sử Đơn Hàng</h2>

        {orders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-light">Bạn chưa có đơn hàng nào.</p>
            <Link
              to="/products"
              className="inline-block mt-4 text-primary hover:underline font-semibold"
            >
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-4 px-4">Mã đơn</th>
                    <th className="py-4 px-4">Ngày đặt</th>
                    <th className="py-4 px-4">Tổng tiền</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-4">Thanh toán</th>
                    <th className="py-4 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {orders
                    .slice(
                      (orderPage - 1) * ordersPerPage,
                      orderPage * ordersPerPage
                    )
                    .map((order) => {
                      let statusColor = "bg-gray-100 text-gray-700";
                      let statusText = "Trạng Thái Khác";
                      switch (order.order_status) {
                        case "pending":
                          statusColor = "bg-yellow-100 text-yellow-700";
                          statusText = "Chờ Xác Nhận";
                          break;
                        case "processing":
                          statusColor = "bg-blue-100 text-blue-700";
                          statusText = "Đang Chuẩn Bị";
                          break;
                        case "shipping":
                          statusColor = "bg-purple-100 text-purple-700";
                          statusText = "Đã Bàn Giao Vận Tải";
                          break;
                        case "completed":
                          statusColor = "bg-green-100 text-green-700";
                          statusText = "Hoàn Thành";
                          break;
                        case "cancelled":
                          statusColor = "bg-red-100 text-red-700";
                          statusText = "Đã Hủy";
                          break;
                        case "returned":
                          statusColor = "bg-orange-100 text-orange-700";
                          statusText = "Trả Hàng";
                          break;
                      }

                      let paymentText = "Chưa thanh toán";
                      let paymentColor = "text-gray-500";
                      if (order.payment_method === "vnpay") {
                        if (order.payment_status === "paid") {
                          paymentText = "VNPAY (Đã TT)";
                          paymentColor = "text-green-600 font-medium";
                        } else if (order.payment_status === "refunded") {
                          paymentText = "VNPAY (Đã hoàn tiền)";
                          paymentColor = "text-blue-600 font-medium";
                        } else {
                          paymentText = "VNPAY (Chưa TT)";
                          paymentColor = "text-orange-500";
                        }
                      } else {
                        paymentText = "Thanh toán COD";
                        paymentColor = "text-gray-600";
                      }

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50/50 transition"
                        >
                          <td className="py-4 px-4 font-semibold text-dark">
                            {order.order_code}
                          </td>
                          <td className="py-4 px-4 text-gray-500">
                            {new Date(order.created_at).toLocaleDateString(
                              "vi-VN"
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold text-primary">
                            {Number(order.final_amount).toLocaleString("vi-VN")}
                            ₫
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`${statusColor} px-2.5 py-1 rounded-full text-xs font-bold`}
                            >
                              {statusText}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={paymentColor}>{paymentText}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedOrderDetails(order)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Xem chi tiết"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              {order.order_status === "pending" && (
                                <button
                                  onClick={() =>
                                    setCancelModal({
                                      isOpen: true,
                                      orderId: order.id,
                                    })
                                  }
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Hủy đơn hàng"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                              {(order.order_status === "completed" ||
                                order.order_status === "cancelled") && (
                                <button
                                  onClick={() => handleBuyAgain(order)}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Mua lại"
                                >
                                  <i className="fas fa-shopping-cart"></i>
                                </button>
                              )}
                              {order.payment_method === "vnpay" &&
                                order.payment_status === "pending" &&
                                order.order_status !== "cancelled" && (
                                  <button
                                    onClick={() => handleRetryPayment(order.id)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Thanh toán lại"
                                  >
                                    <i className="fas fa-credit-card"></i>
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {Math.ceil(orders.length / ordersPerPage) > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                  disabled={orderPage === 1}
                  className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                {[...Array(Math.ceil(orders.length / ordersPerPage))].map(
                  (_, i) => (
                    <button
                      key={i}
                      onClick={() => setOrderPage(i + 1)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium transition ${
                        orderPage === i + 1
                          ? "bg-primary text-white shadow-sm"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    setOrderPage((p) =>
                      Math.min(
                        Math.ceil(orders.length / ordersPerPage),
                        p + 1
                      )
                    )
                  }
                  disabled={
                    orderPage === Math.ceil(orders.length / ordersPerPage)
                  }
                  className="px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN HỦY ĐƠN */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-dark mb-4">
              Xác nhận hủy đơn hàng
            </h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn hàng này không? Quá trình này không
              thể hoàn tác. Nếu bạn đã thanh toán qua VNPAY, tiền sẽ được hoàn
              tự động về tài khoản của bạn.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelModal({ isOpen: false, orderId: null })}
                className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Đóng
              </button>
              <button
                onClick={handleCancelOrder}
                className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition shadow-sm"
              >
                Đồng ý hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 animate-fade-in px-4 py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-full overflow-y-auto animate-slide-up relative">
            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="p-6">
              <h3 className="text-xl font-bold text-dark mb-1">
                Chi tiết đơn hàng #{selectedOrderDetails.order_code}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Ngày đặt:{" "}
                {new Date(selectedOrderDetails.created_at).toLocaleDateString(
                  "vi-VN"
                )}{" "}
                {new Date(selectedOrderDetails.created_at).toLocaleTimeString(
                  "vi-VN"
                )}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Thông tin đơn hàng */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-dark mb-3">
                    <i className="fas fa-info-circle text-primary mr-2"></i>
                    Trạng thái
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Đơn hàng:{" "}
                    <span className="font-bold text-gray-800">
                      {selectedOrderDetails.order_status === "pending"
                        ? "Chờ Xác Nhận"
                        : selectedOrderDetails.order_status === "processing"
                        ? "Đang Chuẩn Bị"
                        : selectedOrderDetails.order_status === "shipping"
                        ? "Đã Bàn Giao Vận Tải"
                        : selectedOrderDetails.order_status === "completed"
                        ? "Hoàn Thành"
                        : selectedOrderDetails.order_status === "cancelled"
                        ? "Đã Hủy"
                        : "Trả Hàng"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Thanh toán:{" "}
                    <span className="font-bold text-gray-800">
                      {selectedOrderDetails.payment_method === "vnpay"
                        ? selectedOrderDetails.payment_status === "paid"
                          ? "VNPAY (Đã Thanh Toán)"
                          : selectedOrderDetails.payment_status === "refunded"
                          ? "VNPAY (Đã Hoàn Tiền)"
                          : "VNPAY (Chưa TT)"
                        : "Thanh toán COD"}
                    </span>
                  </p>
                </div>
                {/* Thông tin giao hàng */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 relative">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-dark">
                      <i className="fas fa-map-marker-alt text-primary mr-2"></i>
                      Giao hàng đến
                    </h4>
                    {(selectedOrderDetails.order_status === "pending" ||
                      selectedOrderDetails.order_status === "processing") && (
                      <button
                        onClick={() => {
                          setShippingModal({
                            isOpen: true,
                            orderId: selectedOrderDetails.id,
                            shipping_name: selectedOrderDetails.shipping_name,
                            shipping_phone: selectedOrderDetails.shipping_phone,
                            shipping_address:
                              selectedOrderDetails.shipping_address,
                          });
                          setSelectedOrderDetails(null);
                        }}
                        className="text-primary hover:text-primary-dark transition text-xs flex items-center gap-1 font-semibold"
                      >
                        <i className="fas fa-edit"></i> Sửa
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedOrderDetails.shipping_name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedOrderDetails.shipping_phone}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedOrderDetails.shipping_address}
                  </p>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <h4 className="font-semibold text-dark mb-3">Sản phẩm đã mua</h4>
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 mb-6">
                {selectedOrderDetails.items &&
                  selectedOrderDetails.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4">
                      <img
                        src={getImageUrl(item.variant?.product?.thumbnail)}
                        alt="Trà"
                        className="w-16 h-16 object-cover rounded-md border border-gray-100"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-dark text-sm">
                          {item.variant?.product?.name}
                        </h3>
                        <p className="text-gray-500 text-xs mt-1">
                          Phân loại: Gói {item.variant?.weight}g
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {Number(item.price).toLocaleString("vi-VN")}₫
                        </p>
                        <p className="text-gray-500 text-xs">
                          SL: x{item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <p className="font-bold text-dark text-lg">Tổng thanh toán:</p>
                <p className="text-primary text-2xl font-bold">
                  {Number(selectedOrderDetails.final_amount).toLocaleString(
                    "vi-VN"
                  )}
                  ₫
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA THÔNG TIN GIAO HÀNG */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full animate-slide-up">
            <h3 className="text-xl font-bold text-dark mb-4">
              Sửa Thông Tin Giao Hàng
            </h3>
            <form onSubmit={handleUpdateShipping} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={shippingModal.shipping_name}
                  onChange={(e) =>
                    setShippingModal({
                      ...shippingModal,
                      shipping_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  required
                  value={shippingModal.shipping_phone}
                  onChange={(e) =>
                    setShippingModal({
                      ...shippingModal,
                      shipping_phone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ giao hàng
                </label>
                <textarea
                  required
                  rows="3"
                  value={shippingModal.shipping_address}
                  onChange={(e) =>
                    setShippingModal({
                      ...shippingModal,
                      shipping_address: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none"
                ></textarea>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() =>
                    setShippingModal({
                      isOpen: false,
                      orderId: null,
                      shipping_name: "",
                      shipping_phone: "",
                      shipping_address: "",
                    })
                  }
                  className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition font-semibold"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
