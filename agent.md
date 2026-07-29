# BỐI CẢNH DỰ ÁN: CK TEA E-COMMERCE

Dự án là một trang web thương mại điện tử chuyên bán trà sấy khô, thiết kế theo kiến trúc tách biệt Frontend và Backend.

## 1. TECH STACK (CÔNG NGHỆ SỬ DỤNG)

- **Frontend:** React.js (Vite), Tailwind CSS, React Router DOM, Fetch API, `react-toastify`.
- **Backend:** Laravel 11, RESTful API, MySQL.
- **Biến môi trường:** URL của API lấy từ `.env` qua `import.meta.env.VITE_API_URL`.

## 2. NGHIỆP VỤ QUẢN LÝ ĐƠN HÀNG & KHO (CỰC KỲ QUAN TRỌNG)

Hệ thống sử dụng luồng trạng thái đơn hàng gắn chặt với nghiệp vụ kho (`batches`):

- `pending` (Chờ xử lý): Khách mới đặt.
- `processing` (Đang chuẩn bị): Admin duyệt đơn, bắt đầu đóng gói.
- `shipping` (Đang giao hàng): Bàn giao cho Shipper. **Yêu cầu cập nhật mã vận đơn (tracking_code)**.
- `completed` (Hoàn thành): Giao thành công, ghi nhận doanh thu.
- `cancelled` (Đã hủy): **BẮT BUỘC TRẢ LẠI TỒN KHO** (Cộng lại `stock` vào đúng các lô `batches` đã trừ trước đó).

## 3. TIẾN ĐỘ FRONTEND

- Đã hoàn thiện giao diện Admin cơ bản, Quản lý Sản phẩm, Quản lý Danh mục.
- File `src/pages/admin/Orders.jsx` đã có bộ khung giao diện tĩnh cho bảng danh sách đơn hàng.

## 4. NHIỆM VỤ HIỆN TẠI (CURRENT MISSION)

Agent cần ưu tiên thực hiện việc hoàn thiện **Module Quản lý Đơn hàng** theo các bước sau:

**Bước 1: Viết API Backend (Laravel)**

- Tạo `Admin/OrderController`.
- API `GET /api/admin/orders`: Lấy danh sách đơn hàng (sắp xếp mới nhất), load kèm thông tin `user` và `order_items` (kèm thông tin `variant` và `product` để lấy tên, ảnh).
- API `GET /api/admin/orders/{id}`: Lấy chi tiết 1 đơn hàng.
- API `PUT /api/admin/orders/{id}/status`: Cập nhật trạng thái đơn hàng.
  - _Logic bắt buộc:_ Nếu request chuyển status thành `cancelled`, phải chạy vòng lặp cộng trả lại số lượng (`quantity`) vào cột `stock` của bảng `batches` tương ứng.
- API `PUT /api/admin/orders/{id}/tracking`: Cập nhật mã vận đơn thủ công.

**Bước 2: Xây dựng Giao diện React (`src/pages/admin/Orders.jsx`)**

- Tích hợp `fetch` gọi API lấy danh sách đơn hàng thật và đổ vào bảng.
- Viết hàm xử lý sự kiện khi thay đổi `<select>` trạng thái -> Gọi API cập nhật status.
- **Tính năng Modal Chi Tiết Đơn Hàng:** Khi bấm nút "Chi tiết", mở một Modal hiển thị:
  - Thông tin người nhận (Tên, SĐT, Địa chỉ).
  - Danh sách các sản phẩm (`order_items`) trong đơn (Hình ảnh, Tên, Biến thể, Số lượng, Đơn giá).
  - Tổng tiền đơn hàng.
  - Form nhỏ để Admin nhập "Mã Vận Đơn" khi đơn hàng chuyển sang trạng thái `shipping`.

## 5. QUY CHUẨN CODE (CODING STANDARDS)

- Sử dụng Functional Component và React Hooks.
- Mọi thao tác cập nhật (Sửa status) phải có xác nhận `window.confirm` và thông báo `toast.success`/`toast.error`.
- Dữ liệu Số điện thoại tối đa 10 chữ số.
- Backend: Sử dụng Eloquent Transaction (`DB::beginTransaction()`) khi xử lý hoàn trả tồn kho để đảm bảo toàn vẹn dữ liệu. Trả về JSON chuẩn.
