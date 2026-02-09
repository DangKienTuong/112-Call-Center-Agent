# Phone Validation in Chatbot

## Overview

Chatbot của hệ thống hotline 112 đã được tích hợp validation số điện thoại Việt Nam để lọc các báo cáo giả và đảm bảo dữ liệu chất lượng.

## Features

✅ **Automatic validation**: Tự động validate số điện thoại khi user cung cấp  
✅ **Smart error messages**: Thông báo lỗi rõ ràng với ví dụ cụ thể  
✅ **Re-prompt on error**: Tự động yêu cầu user nhập lại nếu số không hợp lệ  
✅ **Flexible input**: Hỗ trợ nhiều format (spaces, dashes, +84)  
✅ **Auto-normalization**: Chuẩn hóa về định dạng thống nhất  

---

## How It Works

### 1. User Message Flow

```
User: "Số điện thoại của tôi là 0112345678"
           ↓
    [extractInfoNode]
           ↓
    Validate phone → Invalid!
           ↓
    Set phoneValidationError = true
           ↓
    [routerNode]
           ↓
    Route to collectPhone
           ↓
    [collectPhoneNode]
           ↓
Bot: "❌ Số điện thoại chưa đúng định dạng. Vui lòng cung cấp lại..."
```

### 2. State Management

State được cập nhật với field mới:

```javascript
{
  phone: null,                    // Số điện thoại hợp lệ (nếu có)
  phoneValidationError: false     // Flag báo validation error
}
```

### 3. Validation Logic

**In extractInfoNode** (`nodes/extractInfo.js`):

```javascript
// After extracting phone from user message
const phoneValidation = validateVietnamesePhone(cleanPhone);

if (phoneValidation.isValid) {
  updates.phone = phoneValidation.normalized;
  updates.phoneValidationError = false;
} else {
  updates.phoneValidationError = true;
  // Don't update phone field
}
```

### 4. Router Logic

**In routerNode** (`nodes/router.js`):

```javascript
// Check if phone validation failed
if (state.phoneValidationError) {
  return 'phone'; // Go back to collectPhone
}

// Normal phone check
if (!hasValidPhone && !hasPhoneFromMemory) {
  return 'phone';
}
```

### 5. Collect Phone Node

**In collectPhoneNode** (`nodes/collectInfo.js`):

```javascript
let prompt = '';

if (state.phoneValidationError) {
  // Show error message with examples
  prompt = '❌ Số điện thoại chưa đúng định dạng. Vui lòng cung cấp lại số điện thoại hợp lệ (10 chữ số bắt đầu bằng 09, 03, 07, 08, 05 hoặc định dạng +84). Ví dụ: 0912345678 hoặc +84912345678.';
} else {
  // Normal prompt
  prompt = 'Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.';
}

return {
  response: prompt,
  phoneValidationError: false, // Reset flag
  messages: [...]
};
```

---

## Example Conversations

### ✅ Valid Phone - First Try

```
Bot: Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.
User: 0912345678
Bot: Có bao nhiêu người cần trợ giúp?
```

### ❌ Invalid Phone - Re-prompt

```
Bot: Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.
User: 0112345678
Bot: ❌ Số điện thoại chưa đúng định dạng. Vui lòng cung cấp lại số điện thoại hợp lệ (10 chữ số bắt đầu bằng 09, 03, 07, 08, 05 hoặc định dạng +84). Ví dụ: 0912345678 hoặc +84912345678.
User: 0912345678
Bot: Có bao nhiêu người cần trợ giúp?
```

### ✅ Phone with Spaces - Auto Clean

```
Bot: Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.
User: 091 234 5678
Bot: Có bao nhiêu người cần trợ giúp?
```
(Phone internally normalized to `0912345678`)

### ✅ International Format - Auto Convert

```
Bot: Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.
User: +84912345678
Bot: Có bao nhiêu người cần trợ giúp?
```
(Phone internally normalized to `0912345678`)

---

## Validation Rules

### ✅ Valid Formats

- **10 digits**: `0912345678`
- **Valid prefixes**: 09x, 03x, 07x, 08x, 05x
- **International**: `+84912345678` (9 digits after +84)
- **With formatting**: `091 234 5678`, `091-234-5678`, `(091) 234-5678`

### ❌ Invalid Formats

- Wrong prefix: `0112345678`, `0212345678`
- Wrong length: `091234567` (9 digits), `09123456789` (11 digits)
- Invalid format: `1234567890` (not starting with 0)
- Contains letters: `abc123456`, `0912abc678`

---

## Files Modified

### 1. `state.js`
Added `phoneValidationError` field to track validation status.

```javascript
phoneValidationError: Annotation({
  reducer: (prev, next) => (next !== undefined ? next : prev),
  default: () => false,
})
```

### 2. `nodes/extractInfo.js`
- Import `validateVietnamesePhone`
- Validate phone in both main extraction and fallback
- Set `phoneValidationError` flag appropriately

### 3. `nodes/collectInfo.js`
- Update `collectPhoneNode` to check `phoneValidationError`
- Show detailed error message if validation failed
- Reset error flag after showing message

### 4. `nodes/router.js`
- Check `phoneValidationError` in `determineNextStep()`
- Route back to `collectPhone` if error exists

### 5. `tools/extractors.js`
- Update prompt to emphasize Vietnamese phone format
- Provide examples in schema description

---

## Testing

Run the test suite:

```bash
node backend/tests/chatbotPhoneValidation.test.js
```

**Test coverage:**
- ✅ 9 test cases for validation
- ✅ 4 chatbot flow scenarios
- ✅ Example conversation demonstration

---

## Benefits

1. **Lọc báo cáo giả**: Chỉ chấp nhận số điện thoại hợp lệ
2. **User experience tốt hơn**: Error message rõ ràng với examples
3. **Data quality**: Database chỉ chứa số điện thoại hợp lệ
4. **Flexible**: Hỗ trợ nhiều format input
5. **Consistent**: Tất cả số điện thoại được chuẩn hóa

---

## Error Messages

### Vietnamese Error Message

```
❌ Số điện thoại chưa đúng định dạng. 
Vui lòng cung cấp lại số điện thoại hợp lệ 
(10 chữ số bắt đầu bằng 09, 03, 07, 08, 05 hoặc định dạng +84). 
Ví dụ: 0912345678 hoặc +84912345678.
```

**Key points:**
- ❌ Clear rejection signal
- Explains what's wrong
- Provides valid format
- Shows examples
- User-friendly tone

---

## Integration with Ticket Creation

Khi ticket được tạo, số điện thoại đã được validate và normalize:

```javascript
const ticketData = {
  reporter: {
    phone: state.phone  // "0912345678" - already validated & normalized
  }
  // ... other fields
};
```

Ticket controller cũng có validation (double layer), nhưng ít khi trigger vì chatbot đã validate trước.

---

## Future Enhancements

Có thể cải thiện thêm:

1. **SMS OTP Verification**: Verify số điện thoại qua OTP
2. **Carrier Detection**: Nhận diện nhà mạng (Viettel, Mobifone, etc.)
3. **Blacklist Check**: Kiểm tra số điện thoại có bị blacklist không
4. **Rate Limiting**: Giới hạn số lần nhập sai
5. **Auto-suggest**: Gợi ý fix nếu số gần đúng (e.g., thiếu 1 chữ số)

---

## Troubleshooting

### Issue: Bot không báo lỗi khi phone invalid

**Check:**
1. `phoneValidationError` có được set trong `extractInfoNode`?
2. Router có check `phoneValidationError`?
3. `collectPhoneNode` có check error flag?

### Issue: Bot báo lỗi liên tục

**Check:**
1. `phoneValidationError` có được reset về `false` sau khi show message?
2. Phone có được update khi valid?

### Issue: Phone bị reject dù hợp lệ

**Check:**
1. Valid prefixes có đầy đủ không? (09x, 03x, 07x, 08x, 05x)
2. Validation function có import đúng?

---

## API Reference

### validateVietnamesePhone(phoneNumber)

```javascript
const { validateVietnamesePhone } = require('../../../utils/phoneValidator');

const result = validateVietnamesePhone('0912345678');
// {
//   isValid: true,
//   normalized: '0912345678',
//   internationalFormat: '+84912345678'
// }
```

### State Fields

- `phone`: String | null - Validated phone number
- `phoneValidationError`: Boolean - Validation error flag

### Node Functions

- `extractInfoNode`: Extracts and validates phone
- `collectPhoneNode`: Asks for phone (with error handling)
- `routerNode`: Routes based on validation status

---

## Summary

✅ **Complete integration** của phone validation vào chatbot  
✅ **User-friendly** error messages với examples  
✅ **Automatic re-prompting** khi phone invalid  
✅ **Tested thoroughly** với 9 test cases  
✅ **Production ready**  

Chatbot giờ đây có khả năng validate số điện thoại Việt Nam một cách thông minh và user-friendly!




