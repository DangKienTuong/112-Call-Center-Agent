# Validation Số Điện Thoại Việt Nam

## Mục đích

Để lọc những báo cáo giả tới hệ thống, tất cả số điện thoại phải được validate theo định dạng số điện thoại hợp lệ tại Việt Nam.

## Định dạng hợp lệ

### 1. Định dạng trong nước (Domestic)
- **Cấu trúc**: 10 chữ số, bắt đầu bằng số 0
- **Ví dụ**: `0912345678`, `0323456789`

### 2. Định dạng quốc tế (International)
- **Cấu trúc**: `+84` theo sau bởi 9 chữ số (bỏ số 0 đầu)
- **Ví dụ**: `+84912345678`, `+84323456789`

## Các đầu số hợp lệ tại Việt Nam

| Đầu số | Nhà mạng | Ghi chú |
|--------|----------|---------|
| **09x** | Mobifone, Vietnamobile, Vinaphone, Gmobile | 090-099 |
| **03x** | Viettel, Mobifone, Vinaphone | 032-039 (chuyển đổi từ 016x, 017x, 018x, 019x) |
| **07x** | Viettel, Mobifone, Gmobile | 070, 076-079 |
| **08x** | Vinaphone, Vietnamobile | 081-089 |
| **05x** | Vietnamobile, Vinaphone | 052-059 |

## Cách sử dụng

### 1. Validation trong Controller

```javascript
const { validateVietnamesePhone } = require('../utils/phoneValidator');

// Trong controller
const phoneValidation = validateVietnamesePhone(phoneNumber);

if (!phoneValidation.isValid) {
  return res.status(400).json({
    success: false,
    message: 'Số điện thoại không hợp lệ',
    error: phoneValidation.error
  });
}

// Sử dụng số điện thoại đã được chuẩn hóa
const normalizedPhone = phoneValidation.normalized;
```

### 2. Validation trong Model (Mongoose)

Model `Ticket` đã được cấu hình với custom validator:

```javascript
phone: {
  type: String,
  required: true,
  validate: {
    validator: function(v) {
      const validation = validateVietnamesePhone(v);
      return validation.isValid;
    },
    message: props => {
      const validation = validateVietnamesePhone(props.value);
      return validation.error || 'Số điện thoại không hợp lệ';
    }
  }
}
```

### 3. Middleware cho Express Routes

```javascript
const { validatePhoneMiddleware } = require('../utils/phoneValidator');

// Validate phone ở field đơn giản
router.post('/endpoint', validatePhoneMiddleware('phone'), controller.method);

// Validate phone ở nested object
router.post('/ticket', validatePhoneMiddleware('reporter.phone'), ticketController.createTicket);
```

## Các trường hợp xử lý

### ✅ Hợp lệ

```javascript
'0912345678'        // Domestic format
'0323456789'        // Viettel converted number
'+84912345678'      // International format
'091 234 5678'      // With spaces (tự động làm sạch)
'091-234-5678'      // With dashes (tự động làm sạch)
'(091) 234-5678'    // With parentheses (tự động làm sạch)
```

### ❌ Không hợp lệ

```javascript
'0112345678'        // Đầu số 011 không hợp lệ
'091234567'         // Chỉ có 9 chữ số
'09123456789'       // Có 11 chữ số
'1234567890'        // Không bắt đầu bằng 0
'+841234567890'     // +84 với 10 chữ số (phải là 9)
'0912abc678'        // Chứa ký tự không phải số
''                  // Chuỗi rỗng
```

## Chuẩn hóa (Normalization)

Tất cả số điện thoại được tự động chuẩn hóa về định dạng trong nước (10 chữ số bắt đầu bằng 0):

```javascript
Input: '+84912345678'  → Normalized: '0912345678'
Input: '091 234 5678'  → Normalized: '0912345678'
Input: '091-234-5678'  → Normalized: '0912345678'
```

Định dạng quốc tế cũng được cung cấp:

```javascript
{
  isValid: true,
  normalized: '0912345678',           // Domestic format
  internationalFormat: '+84912345678'  // International format
}
```

## Testing

Chạy test suite để kiểm tra validation:

```bash
node backend/tests/phoneValidator.test.js
```

Test suite bao gồm:
- ✅ 17 test cases cho số hợp lệ
- ✅ 14 test cases cho số không hợp lệ
- ✅ Test các định dạng khác nhau (spaces, dashes, parentheses)
- ✅ Test tất cả các đầu số hợp lệ (09x, 03x, 07x, 08x, 05x)

## API Response

### Success Response
```json
{
  "success": true,
  "data": {
    "ticketId": "TD-20241214-...",
    "reporter": {
      "phone": "0912345678"
    }
  }
}
```

### Error Response (Invalid Phone)
```json
{
  "success": false,
  "message": "Số điện thoại không hợp lệ",
  "error": "Đầu số 011 không hợp lệ tại Việt Nam. Các đầu số hợp lệ: 09x, 03x, 07x, 08x, 05x",
  "field": "reporter.phone"
}
```

## Lợi ích

1. **Lọc báo cáo giả**: Chỉ chấp nhận số điện thoại hợp lệ tại Việt Nam
2. **Chuẩn hóa dữ liệu**: Tất cả số điện thoại được lưu trong cùng một định dạng
3. **Trải nghiệm người dùng tốt**: Hỗ trợ nhiều định dạng nhập (có spaces, dashes)
4. **Validation đa tầng**: Validation ở cả controller và model level
5. **Thông báo lỗi rõ ràng**: Người dùng biết chính xác lỗi là gì

## Tham khảo

- [Danh sách đầu số di động Việt Nam](https://mic.gov.vn/)
- [Quy hoạch mã số mạng di động](https://thuvienphapluat.vn/)




