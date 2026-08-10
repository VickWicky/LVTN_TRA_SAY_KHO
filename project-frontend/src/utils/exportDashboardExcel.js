import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const statusTranslations = {
  pending: "Chờ xác nhận",
  processing: "Đang chuẩn bị",
  shipping: "Đã Bàn Giao Vận Tải",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returned: "Trả hàng",
};

const paymentMethodTranslations = {
  cod: "Tiền mặt",
  vnpay: "VNPay",
};

const paymentStatusTranslations = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thất bại",
};

export const exportDashboardExcel = async ({ timeRange, startDate, endDate, isSales }) => {
  const token = localStorage.getItem("token");
  let url = `${API_URL}/api/admin/dashboard-stats?range=${timeRange}&export=true`;
  if (timeRange === "custom") {
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn từ ngày và đến ngày");
      return;
    }
    url += `&start_date=${startDate}&end_date=${endDate}`;
  }
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  
  if (!response.ok) throw new Error("Lỗi khi tải dữ liệu xuất báo cáo");
  const exportStats = await response.json();

  const timeLabel =
    timeRange === "today" ? "Hôm nay"
      : timeRange === "7days" ? "7 Ngày qua"
      : timeRange === "thisMonth" ? "Tháng này"
      : timeRange === "thisYear" ? "Năm nay"
      : "Tất cả";

  const wb = XLSX.utils.book_new();

  // ==========================================
  // Data Processing
  // ==========================================
  const orders = exportStats.recent_orders || [];
  const totalOrdersCount = orders.length;
  let totalOrderValue = 0;
  let paidOrdersCount = 0;
  let totalPaidAmount = 0;
  let unpaidOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let refundedOrdersCount = 0;
  let totalRefundedAmount = 0;
  let totalRecognizedRevenue = 0;
  const dailyStatsMap = {};

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  orders.forEach(order => {
    const amount = Number(order.final_amount);
    totalOrderValue += amount;
    
    let isPaid = false;
    let isRefunded = false;

    if (order.payment_status === "paid") {
      paidOrdersCount++;
      totalPaidAmount += amount;
      isPaid = true;
      totalRecognizedRevenue += amount; // Doanh thu chỉ tính đơn paid
    } else if (order.payment_status === "refunded") {
      refundedOrdersCount++;
      totalRefundedAmount += amount;
      isRefunded = true;
    } else {
      unpaidOrdersCount++;
    }

    if (order.order_status === "cancelled") {
      cancelledOrdersCount++;
    }

    // Daily stats aggregation
    const dayKey = formatDateShort(order.created_at);
    if (!dailyStatsMap[dayKey]) {
      dailyStatsMap[dayKey] = {
        ordersCount: 0,
        revenue: 0,
        paidAmount: 0,
        refundedAmount: 0
      };
    }
    dailyStatsMap[dayKey].ordersCount++;
    if (isPaid) {
      dailyStatsMap[dayKey].paidAmount += amount;
      dailyStatsMap[dayKey].revenue += amount;
    }
    if (isRefunded) {
      dailyStatsMap[dayKey].refundedAmount += amount;
    }
  });
  
  const totalNetAfterRefund = totalPaidAmount - totalRefundedAmount;

  const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // ==========================================
  // 1. Sheet Tổng Quan
  // ==========================================
  const overviewData = [
    ["BÁO CÁO KINH DOANH"],
    ["Khoảng thời gian báo cáo:", timeLabel],
    ["Ngày xuất báo cáo:", formatDate(new Date())],
    [],
    ["Tổng quan đơn hàng"],
    ["Tổng số đơn hàng", totalOrdersCount],
    ["Tổng giá trị đơn hàng", formatMoney(totalOrderValue)],
    ["Số đơn đã thanh toán", paidOrdersCount],
    ["Số đơn chưa thanh toán", unpaidOrdersCount],
    ["Số đơn đã hủy", cancelledOrdersCount],
    ["Số đơn hoàn tiền", refundedOrdersCount],
    [],
  ];

  if (!isSales) {
    overviewData.push(
      ["Tài chính"],
      ["Tiền đã thanh toán", formatMoney(totalPaidAmount)],
      ["Tiền hoàn trả", formatMoney(totalRefundedAmount)],
      ["Tiền thuần sau hoàn", formatMoney(totalNetAfterRefund)],
      ["Doanh thu từ đơn đã thanh toán", formatMoney(totalRecognizedRevenue)],
      [],
      ["GHI CHÚ NGHIỆP VỤ"],
      ["Doanh thu trong báo cáo được tính dựa trên các đơn hàng đã thanh toán."],
      ["Tiền hoàn trả được tách riêng và không tính vào doanh thu từ đơn đã thanh toán."]
    );
  }

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview["!cols"] = [{ wch: 45 }, { wch: 25 }];
  wsOverview["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Merge BÁO CÁO KINH DOANH
  ];
  XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng Quan");

  // ==========================================
  // 2. Sheet Chi Tiết Đơn Hàng
  // ==========================================
  const ordersHeader = [
    "STT", "Mã Đơn", "Khách Hàng", "Ngày Đặt", "Phương Thức Thanh Toán", 
    "Trạng Thái Thanh Toán", "Trạng Thái Đơn Hàng", "Tổng Giá Trị Đơn", 
    "Tiền Đã Thanh Toán", "Tiền Hoàn Trả", "Doanh Thu Từ Đơn Đã Thanh Toán", "Ghi Chú"
  ];
  
  const ordersBody = orders.map((order, index) => {
    const amount = Number(order.final_amount);
    let paidAmount = 0;
    let refundAmount = 0;
    let recognizedRev = 0;
    let note = "";

    if (order.payment_status === "paid") {
      paidAmount = amount;
      recognizedRev = amount;
      if (order.order_status === "cancelled") {
        note = "Đơn đã hủy - cần đối chiếu trạng thái hoàn tiền";
      } else {
        note = "Đã thanh toán - tính vào doanh thu";
      }
    } else if (order.payment_status === "refunded") {
      refundAmount = amount;
      note = "Đã hoàn tiền";
    } else {
      // unpaid or pending
      if (order.order_status === "cancelled") {
        note = "Đơn đã hủy - không phát sinh doanh thu";
      } else {
        note = "Chưa thanh toán - chưa tính vào doanh thu";
      }
    }

    return [
      index + 1,
      order.order_code,
      order.shipping_name,
      formatDate(order.created_at),
      paymentMethodTranslations[order.payment_method] || order.payment_method || "N/A",
      paymentStatusTranslations[order.payment_status] || order.payment_status || "N/A",
      statusTranslations[order.order_status] || order.order_status,
      formatMoney(amount),
      formatMoney(paidAmount),
      formatMoney(refundAmount),
      formatMoney(recognizedRev),
      note
    ];
  });

  const ordersFooter = [
    "TỔNG CỘNG", "", "", "", "", "", "",
    formatMoney(totalOrderValue),
    formatMoney(totalPaidAmount),
    formatMoney(totalRefundedAmount),
    formatMoney(totalRecognizedRevenue),
    ""
  ];

  const ordersNetRow = [
    "Tiền Thuần Sau Hoàn", "", "", "", "", "", "", "", "", "", formatMoney(totalNetAfterRefund), ""
  ];

  const wsOrders = XLSX.utils.aoa_to_sheet([ordersHeader, ...ordersBody, ordersFooter, ordersNetRow]);
  wsOrders["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 22 }, 
    { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, 
    { wch: 35 }, { wch: 45 }
  ];
  wsOrders["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  wsOrders["!autofilter"] = { ref: `A1:L${orders.length + 1}` };
  XLSX.utils.book_append_sheet(wb, wsOrders, "Chi Tiết Đơn Hàng");

  // ==========================================
  // 3. Sheet Sản Phẩm Bán Ra
  // ==========================================
  const productsHeader = ["STT", "Tên Sản Phẩm", "Số Lượng Bán", "Doanh Thu", "Tỷ Trọng Doanh Thu", "Giá Bán Trung Bình"];
  const productsBody = (exportStats.top_products || []).map((product, idx) => [
    idx + 1,
    product.name,
    Number(product.total_sold),
    "N/A",
    "N/A",
    "N/A"
  ]);
  productsBody.push(["", "(Ghi chú: Doanh thu sản phẩm chưa được cung cấp từ API.)", "", "", "", ""]);
  
  const wsProducts = XLSX.utils.aoa_to_sheet([productsHeader, ...productsBody]);
  wsProducts["!cols"] = [{ wch: 5 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
  wsProducts["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  wsProducts["!autofilter"] = { ref: `A1:F1` };
  XLSX.utils.book_append_sheet(wb, wsProducts, "Sản Phẩm Bán Ra");

  // ==========================================
  // 4. Sheet Doanh Thu Theo Ngày
  // ==========================================
  const dailyDataHeader = ["Ngày", "Số Đơn Hàng", "Doanh Thu Từ Đơn Đã Thanh Toán", "Tiền Đã Thanh Toán", "Tiền Hoàn Trả", "Tiền Thuần Sau Hoàn"];
  const dailyKeys = Object.keys(dailyStatsMap).sort((a, b) => {
    // Sort DD/MM/YYYY string as dates
    const [d1, m1, y1] = a.split('/');
    const [d2, m2, y2] = b.split('/');
    return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
  });

  const dailyBody = dailyKeys.map(dayKey => {
    const d = dailyStatsMap[dayKey];
    const netAfterRefund = d.paidAmount - d.refundedAmount;
    return [
      dayKey,
      d.ordersCount,
      formatMoney(d.revenue),
      formatMoney(d.paidAmount),
      formatMoney(d.refundedAmount),
      formatMoney(netAfterRefund)
    ];
  });

  const wsDaily = XLSX.utils.aoa_to_sheet(
    isSales 
      ? [["Tính năng này không khả dụng cho tài khoản Sales."]]
      : [dailyDataHeader, ...dailyBody]
  );
  if (!isSales) {
    wsDaily["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    wsDaily["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    wsDaily["!autofilter"] = { ref: `A1:F${dailyBody.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsDaily, "Doanh Thu Theo Ngày");

  // ==========================================
  // 5. Sheet Thống Kê Trạng Thái
  // ==========================================
  const statusValueMap = {};
  orders.forEach(order => {
    if (!statusValueMap[order.order_status]) statusValueMap[order.order_status] = 0;
    statusValueMap[order.order_status] += Number(order.final_amount);
  });

  const statusHeader = ["Trạng Thái Đơn Hàng", "Số Lượng Đơn", "Tổng Giá Trị", "Tỷ Lệ (Số Đơn)"];
  const statusBody = (exportStats.orders_by_status || []).map(item => {
    const valueSum = statusValueMap[item.name] || 0;
    const rate = totalOrdersCount > 0 ? (Number(item.value) / totalOrdersCount) : 0;
    const formatPercent = (val) => (val * 100).toFixed(2) + '%';
    return [
      statusTranslations[item.name] || item.name,
      Number(item.value),
      formatMoney(valueSum),
      formatPercent(rate)
    ];
  });

  const wsStatus = XLSX.utils.aoa_to_sheet([statusHeader, ...statusBody]);
  wsStatus["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
  wsStatus["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  wsStatus["!autofilter"] = { ref: `A1:D${statusBody.length + 1}` };
  XLSX.utils.book_append_sheet(wb, wsStatus, "Thống Kê Trạng Thái");

  // ==========================================
  // Xuất file
  // ==========================================
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bao_Cao_Kinh_Doanh_${timeRange}_${today}.xlsx`);
};
