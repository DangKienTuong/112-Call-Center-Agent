# Chatbot Phone Validation Update - Summary

## ✅ Completed

Chatbot đã được cập nhật để **validate số điện thoại Việt Nam** và **tự động yêu cầu user nhập lại** nếu số điện thoại không đúng định dạng.

---

## 📝 Changes Made

### 1. State Management (`state.js`)

**Added new field:**
```javascript
phoneValidationError: Annotation({
  reducer: (prev, next) => (next !== undefined ? next : prev),
  default: () => false,
})
```

### 2. Extract Info Node (`nodes/extractInfo.js`)

**Added validation logic:**
```javascript
const { validateVietnamesePhone } = require('../../../utils/phoneValidator');

// Validate phone
const phoneValidation = validateVietnamesePhone(cleanPhone);

if (phoneValidation.isValid) {
  updates.phone = phoneValidation.normalized;
  updates.phoneValidationError = false;
} else {
  updates.phoneValidationError = true;
}
```

### 3. Collect Phone Node (`nodes/collectInfo.js`)

**Added error handling:**
```javascript
if (state.phoneValidationError) {
  prompt = '❌ Số điện thoại chưa đúng định dạng. Vui lòng cung cấp lại số điện thoại hợp lệ (10 chữ số bắt đầu bằng 09, 03, 07, 08, 05 hoặc định dạng +84). Ví dụ: 0912345678 hoặc +84912345678.';
} else {
  prompt = 'Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.';
}
```

### 4. Router Node (`nodes/router.js`)

**Added routing logic:**
```javascript
// If phone validation failed, go back to collectPhone
if (state.phoneValidationError) {
  return 'phone';
}
```

### 5. Extraction Prompt (`tools/extractors.js`)

**Updated prompt to emphasize phone format:**
```javascript
phone: z.string().optional().describe('Số điện thoại liên hệ Việt Nam (10 chữ số bắt đầu bằng 09/03/07/08/05 hoặc +84 theo sau 9 chữ số). Ví dụ: 0912345678 hoặc +84912345678')
```

---

## 🧪 Testing

**Test file created:** `backend/tests/chatbotPhoneValidation.test.js`

```bash
$ node backend/tests/chatbotPhoneValidation.test.js
✅ 9/9 tests passed
🎉 All integration points verified
```

---

## 💬 Example Conversation

### Before (No Validation)

```
Bot: Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.
User: 0112345678
Bot: Có bao nhiêu người cần trợ giúp?
```
❌ Problem: Invalid phone accepted

### After (With Validation)

```
Bot: Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.
User: 0112345678
Bot: ❌ Số điện thoại chưa đúng định dạng. Vui lòng cung cấp lại số điện thoại hợp lệ (10 chữ số bắt đầu bằng 09, 03, 07, 08, 05 hoặc định dạng +84). Ví dụ: 0912345678 hoặc +84912345678.
User: 0912345678
Bot: Có bao nhiêu người cần trợ giúp?
```
✅ Solution: Invalid phone rejected, user prompted to provide valid phone

---

## 📊 Validation Rules

### ✅ Valid Formats

| Format | Example | Description |
|--------|---------|-------------|
| Domestic 10 digits | `0912345678` | Standard format |
| International | `+84912345678` | 9 digits after +84 |
| With spaces | `091 234 5678` | Auto-cleaned |
| With dashes | `091-234-5678` | Auto-cleaned |

### ✅ Valid Prefixes

- **09x**: 090-099 (Mobifone, Vietnamobile, Vinaphone)
- **03x**: 032-039 (Viettel converted numbers)
- **07x**: 070, 076-079 (Viettel, Mobifone)
- **08x**: 081-089 (Vinaphone, Vietnamobile)
- **05x**: 052-059 (Vietnamobile)

### ❌ Invalid Examples

- `0112345678` - Wrong prefix (011)
- `091234567` - Only 9 digits
- `09123456789` - 11 digits
- `abc123456` - Contains letters
- `1234567890` - Not starting with 0

---

## 📦 Files Modified

```
backend/
├── services/langgraph/
│   ├── state.js                              ✏️ Added phoneValidationError field
│   ├── nodes/
│   │   ├── extractInfo.js                    ✏️ Added validation logic
│   │   ├── collectInfo.js                    ✏️ Added error message
│   │   └── router.js                         ✏️ Added routing logic
│   ├── tools/
│   │   └── extractors.js                     ✏️ Updated prompt
│   └── PHONE_VALIDATION_CHATBOT.md           ⭐ NEW - Documentation
└── tests/
    └── chatbotPhoneValidation.test.js        ⭐ NEW - Test suite
```

**Total: 5 files modified + 2 files created**

---

## 🎯 Benefits

1. ✅ **Lọc báo cáo giả**: Chỉ số điện thoại hợp lệ được chấp nhận
2. ✅ **UX tốt hơn**: Error message rõ ràng với examples
3. ✅ **Data quality**: Database chỉ chứa số điện thoại valid
4. ✅ **Flexible**: Hỗ trợ nhiều format input (spaces, dashes, +84)
5. ✅ **Auto-normalize**: Tất cả số điện thoại về format thống nhất
6. ✅ **Re-prompt**: Tự động yêu cầu nhập lại nếu invalid

---

## 🚀 How It Works

```
┌──────────────────────────────────────────────────────┐
│  User Message: "0112345678"                          │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  extractInfoNode:                                    │
│  - Extract phone from message                        │
│  - Validate using validateVietnamesePhone()          │
│  - Result: Invalid (wrong prefix 011)                │
│  - Set: phoneValidationError = true                  │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  routerNode:                                         │
│  - Check: state.phoneValidationError === true        │
│  - Decision: Route to 'collectPhone'                 │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  collectPhoneNode:                                   │
│  - Detect: phoneValidationError === true             │
│  - Show: "❌ Số điện thoại chưa đúng định dạng..."   │
│  - Reset: phoneValidationError = false               │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│  Bot Response:                                       │
│  "❌ Số điện thoại chưa đúng định dạng.             │
│   Vui lòng cung cấp lại số điện thoại hợp lệ..."    │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 Integration Points

### 1. **Extraction** (`extractInfo.js`)
- Extracts phone from user message
- Validates format using `validateVietnamesePhone()`
- Sets `phoneValidationError` flag

### 2. **Routing** (`router.js`)
- Checks `phoneValidationError` flag
- Routes back to `collectPhone` if error

### 3. **Collection** (`collectInfo.js`)
- Detects error flag
- Shows appropriate error message
- Resets flag after showing message

### 4. **Prompt** (`extractors.js`)
- LLM receives updated prompt
- Emphasizes Vietnamese phone format
- Better extraction accuracy

---

## 📚 Documentation

**Full documentation available at:**
- `backend/services/langgraph/PHONE_VALIDATION_CHATBOT.md`

**Test suite:**
- `backend/tests/chatbotPhoneValidation.test.js`

---

## ✅ Checklist

- [x] Added `phoneValidationError` to state
- [x] Implemented validation in `extractInfoNode`
- [x] Updated `collectPhoneNode` with error handling
- [x] Updated router logic
- [x] Updated LLM prompt
- [x] Created test suite (9 tests passed)
- [x] Created documentation
- [x] Tested conversation flow

---

## 🎓 Usage for Developers

### To test the chatbot validation:

```bash
# Run test suite
node backend/tests/chatbotPhoneValidation.test.js

# Start backend server
cd backend
npm start

# Test via API or frontend
```

### To customize error message:

Edit `backend/services/langgraph/nodes/collectInfo.js`:

```javascript
if (state.phoneValidationError) {
  prompt = 'Your custom error message here...';
}
```

### To add more valid prefixes:

Edit `backend/utils/phoneValidator.js`:

```javascript
const VALID_PREFIXES = [
  // ... existing prefixes
  '06x', '06y', // Add new prefixes
];
```

---

## 🎉 Summary

| Aspect | Status |
|--------|--------|
| Validation Logic | ✅ Implemented |
| Error Handling | ✅ Implemented |
| Router Integration | ✅ Implemented |
| Tests | ✅ 9/9 Passed |
| Documentation | ✅ Complete |
| Production Ready | ✅ Yes |

**Chatbot giờ đây có khả năng validate số điện thoại Việt Nam một cách thông minh và tự động yêu cầu user cung cấp lại nếu số điện thoại không hợp lệ!** 🎊



