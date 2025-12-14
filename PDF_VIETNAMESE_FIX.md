# Sửa lỗi PDF không hiển thị tiếng Việt có dấu

## Vấn đề

PDFKit (thư viện tạo PDF) mặc định không hỗ trợ Unicode/tiếng Việt có dấu. Các ký tự như ă, ộ, ế, ị sẽ không hiển thị hoặc hiển thị sai.

## Giải pháp

Đã thêm font Roboto (hỗ trợ tiếng Việt) vào project và cấu hình PDFKit sử dụng font này.

## Các thay đổi đã thực hiện

### 1. Backend - `controllers/ticketController.js`
- Thêm logic tự động tìm và load font hỗ trợ tiếng Việt
- Thứ tự ưu tiên:
  1. Font Roboto trong project (`backend/fonts/Roboto-Regular.ttf`)
  2. Arial trên Windows (`C:\Windows\Fonts\arial.ttf`)
  3. Arial trên macOS
  4. DejaVu Sans trên Linux
- Cập nhật tất cả text trong PDF sang tiếng Việt có dấu đúng

### 2. Script tải font - `scripts/downloadFont.js`
- Tự động tải font Roboto từ Google Fonts
- Có thể chạy: `npm run font:download`

### 3. Font directory - `backend/fonts/`
- Chứa font Roboto-Regular.ttf
- Có README hướng dẫn

## Cách sử dụng

### Lần đầu setup (nếu font chưa có):

```bash
cd backend
npm run font:download
```

### Hoặc tải font manually:

1. Truy cập https://fonts.google.com/specimen/Roboto
2. Download font Roboto Regular
3. Đổi tên file thành `Roboto-Regular.ttf`
4. Copy vào thư mục `backend/fonts/`

### Restart server:

```bash
cd backend
npm start
```

## Test

1. Đăng nhập vào hệ thống
2. Mở một ticket bất kỳ
3. Click nút "Tải xuống PDF"
4. Mở file PDF và kiểm tra các ký tự tiếng Việt có dấu

## Kết quả mong đợi

PDF sẽ hiển thị đúng các text tiếng Việt:
- ✅ PHIẾU BÁO CÁO SỰ CỐ KHẨN CẤP
- ✅ Địa chỉ: 140 nguy Ấn công trẻ, an hủi, tphcm
- ✅ Tên, Số điện thoại, Email
- ✅ Vị trí sự cố, Mô tả tình huống
- ✅ Hỗ trợ yêu cầu

## Fallback

Nếu không tìm thấy font nào hỗ trợ tiếng Việt, hệ thống sẽ:
1. Log warning trong console
2. Sử dụng font mặc định (có thể không hiển thị đúng tiếng Việt)
3. PDF vẫn được tạo nhưng text có thể bị lỗi

## License

Font Roboto được cấp phép theo Apache License 2.0

