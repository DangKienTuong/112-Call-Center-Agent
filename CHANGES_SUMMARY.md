# Tóm tắt các thay đổi - Session ngày 14/12/2025

## 1. Sửa lỗi nhãn "Đã tạo phiếu" đè lên text

**Files:** `frontend/src/components/ChatHistory.js`

**Vấn đề:** Nhãn "Đã tạo phiếu" màu xanh đang đè lên text thông tin cuộc trò chuyện.

**Giải pháp:** Thêm `sx={{ pr: 20 }}` cho `ListItemText` để tạo padding bên phải.

---

## 2. Sửa lỗi link "Phiếu của tôi" không hoạt động

**Files:** 
- `backend/controllers/chatController.js`
- `backend/services/langgraph/index.js`
- `frontend/src/components/MyTickets.js`
- `frontend/src/components/ChatHistory.js`

**Vấn đề:** Link đến ticket detail bị lỗi "Phiếu không tồn tại".

**Nguyên nhân:** Đang dùng `ticketId` (string "TD-...") thay vì MongoDB `_id` để navigate.

**Giải pháp:**
- Backend: Trả về thêm field `_id` (MongoDB ObjectId) trong `getTicketHistory` và `getUserChatHistory`
- Frontend: Sử dụng `ticket._id` và `session.ticketMongoId` thay vì `ticketId` để navigate

---

## 3. Sửa lỗi tải xuống PDF - quyền truy cập

**Files:**
- `backend/routes/tickets.js`
- `backend/controllers/ticketController.js`

**Vấn đề:** User role "reporter" không thể tải PDF của ticket của họ.

**Giải pháp:**
- Bỏ middleware `isAdminOrStaff` khỏi route PDF
- Thêm logic kiểm tra quyền trong controller: reporter chỉ xem được PDF của ticket mình tạo (check phone number)
- Hỗ trợ cả MongoDB `_id` và `ticketId` string để tìm ticket

---

## 4. Sửa lỗi PDF không hiển thị tiếng Việt có dấu

**Files:**
- `backend/controllers/ticketController.js`
- `backend/scripts/downloadFont.js` (mới)
- `backend/fonts/Roboto-Regular.ttf` (mới)
- `backend/fonts/README.md` (mới)
- `backend/package.json`

**Vấn đề:** PDF xuất ra bị lỗi với ký tự tiếng Việt có dấu (ă, ộ, ế, ị hiển thị sai).

**Nguyên nhân:** PDFKit không hỗ trợ Unicode/tiếng Việt mặc định.

**Giải pháp:**
1. **Thêm font Roboto** (hỗ trợ tiếng Việt) vào project
2. **Tự động tìm font** theo thứ tự ưu tiên:
   - Font Roboto trong project (`backend/fonts/Roboto-Regular.ttf`)
   - Arial trên Windows
   - Times New Roman trên Windows
   - Arial trên macOS
   - DejaVu Sans trên Linux
3. **Register font với PDFKit** và sử dụng cho tất cả text
4. **Cập nhật text** trong PDF sang tiếng Việt có dấu đúng
5. **Tạo script tải font**: `npm run font:download`

**Cấu trúc mới:**
```
backend/
  ├── fonts/
  │   ├── Roboto-Regular.ttf
  │   └── README.md
  └── scripts/
      └── downloadFont.js
```

---

## Hướng dẫn kiểm tra

### 1. Kiểm tra layout ChatHistory
- Mở trang Chat
- Xem phần "Cuộc trò chuyện gần đây"
- Nhãn "Đã tạo phiếu" không đè lên text nữa

### 2. Kiểm tra link "Phiếu của tôi"
- Mở trang Chat (đã đăng nhập)
- Click vào ticket trong "Phiếu của tôi"
- Trang detail ticket mở đúng

### 3. Kiểm tra tải PDF
- Mở một ticket detail
- Click "Tải xuống PDF"
- PDF tải về thành công
- Mở PDF → Text tiếng Việt hiển thị đúng (có dấu)

---

## Commands cần chạy

```bash
# Backend - Tải font (nếu chưa có)
cd backend
npm run font:download

# Restart backend
npm start

# Frontend (no changes needed, just refresh browser)
```

---

## Notes

- Font Roboto được cấp phép theo Apache License 2.0
- Tất cả thay đổi đều backward compatible
- Không cần thay đổi database
- Không cần update dependencies
