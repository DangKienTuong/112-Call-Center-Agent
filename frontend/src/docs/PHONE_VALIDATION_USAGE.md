# Phone Validation - Frontend Usage Guide

## Giới thiệu

Hệ thống validation số điện thoại Việt Nam cho frontend bao gồm:
- Utility functions để validate số điện thoại
- Custom React hook để quản lý state và validation
- Component PhoneInput có sẵn để sử dụng trong forms

## Các cách sử dụng

### 1. Sử dụng PhoneInput Component (Khuyến nghị)

Cách dễ nhất để thêm phone input với validation:

```jsx
import PhoneInput from './components/PhoneInput';
import { useState } from 'react';

function MyForm() {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    setPhoneError(''); // Clear error on change
  };

  const handlePhoneBlur = () => {
    // Validation logic if needed
  };

  return (
    <PhoneInput
      value={phone}
      onChange={handlePhoneChange}
      onBlur={handlePhoneBlur}
      error={phoneError}
      label="Số điện thoại"
      required={true}
      showHint={true}
      autoFormat={true}
    />
  );
}
```

### 2. Sử dụng usePhoneValidation Hook

Hook tự động xử lý validation và state management:

```jsx
import { usePhoneValidation } from './hooks/usePhoneValidation';

function MyForm() {
  const phone = usePhoneValidation('', false); // validateOnChange = false

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (phone.validate()) {
      const normalizedPhone = phone.getNormalizedValue();
      console.log('Valid phone:', normalizedPhone);
      // Submit form...
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="phone">Số điện thoại *</label>
        <input
          id="phone"
          type="tel"
          value={phone.value}
          onChange={phone.onChange}
          onBlur={phone.onBlur}
          className={phone.error ? 'error' : ''}
        />
        {phone.error && <span className="error">{phone.error}</span>}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 3. Sử dụng Utility Functions Trực Tiếp

Để validate thủ công:

```jsx
import { validateVietnamesePhone, formatPhoneNumber } from './utils/phoneValidator';

function validateAndSubmit(phoneNumber) {
  const validation = validateVietnamesePhone(phoneNumber);
  
  if (!validation.isValid) {
    console.error('Invalid phone:', validation.errorKey);
    return;
  }
  
  console.log('Valid phone:', validation.normalized);
  console.log('International:', validation.internationalFormat);
  
  // Submit with normalized phone
  submitForm(validation.normalized);
}

// Format phone for display
function displayPhone(phoneNumber) {
  return formatPhoneNumber(phoneNumber);
  // "0912345678" -> "091 234 5678"
  // "+84912345678" -> "+84 91 234 5678"
}
```

## PhoneInput Component API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | `''` | Giá trị số điện thoại |
| `onChange` | function | - | Handler khi giá trị thay đổi |
| `onBlur` | function | - | Handler khi input mất focus |
| `error` | string | `''` | Thông báo lỗi hiển thị |
| `required` | boolean | `false` | Có bắt buộc không |
| `disabled` | boolean | `false` | Có disable không |
| `label` | string | `''` | Text của label |
| `placeholder` | string | auto | Placeholder text |
| `name` | string | `'phone'` | Attribute name |
| `id` | string | `'phone'` | Attribute id |
| `showHint` | boolean | `true` | Hiển thị gợi ý |
| `autoFormat` | boolean | `false` | Tự động format khi blur |
| `className` | string | `''` | Custom CSS class |

### Example với tất cả props:

```jsx
<PhoneInput
  value={phoneValue}
  onChange={(e) => setPhoneValue(e.target.value)}
  onBlur={handlePhoneBlur}
  error={phoneError}
  required={true}
  disabled={false}
  label="Số điện thoại liên hệ"
  placeholder="Ví dụ: 0912345678"
  name="contactPhone"
  id="contact-phone"
  showHint={true}
  autoFormat={true}
  className="custom-phone-input"
/>
```

## usePhoneValidation Hook API

### Return Values

```jsx
const {
  value,              // Giá trị hiện tại
  error,              // Message lỗi (nếu có)
  isValid,            // Boolean: có hợp lệ không
  touched,            // Boolean: đã blur chưa
  onChange,           // Handler cho onChange event
  onBlur,             // Handler cho onBlur event
  validate,           // Function: validate thủ công
  reset,              // Function: reset về giá trị ban đầu
  getNormalizedValue, // Function: lấy giá trị đã chuẩn hóa
  setValue            // Function: set giá trị mới
} = usePhoneValidation(initialValue, validateOnChange);
```

### Parameters

- `initialValue` (string): Giá trị ban đầu (default: `''`)
- `validateOnChange` (boolean): Validate ngay khi thay đổi (default: `false`)

### Example:

```jsx
const phone = usePhoneValidation('0912345678', true);

// Get normalized value before submit
const normalizedPhone = phone.getNormalizedValue();

// Reset form
phone.reset();

// Set new value programmatically
phone.setValue('+84912345678');

// Validate manually
if (phone.validate()) {
  console.log('Phone is valid!');
}
```

## Utility Functions API

### validateVietnamesePhone(phoneNumber)

Validate số điện thoại:

```jsx
const result = validateVietnamesePhone('0912345678');

// Result structure:
{
  isValid: true,
  normalized: '0912345678',
  internationalFormat: '+84912345678',
  errorKey: null  // hoặc translation key nếu invalid
}
```

### formatPhoneNumber(phoneNumber)

Format số điện thoại để hiển thị:

```jsx
formatPhoneNumber('0912345678')     // "091 234 5678"
formatPhoneNumber('+84912345678')   // "+84 91 234 5678"
```

### isValidPhoneNumber(phoneNumber)

Check nhanh số điện thoại có hợp lệ không:

```jsx
isValidPhoneNumber('0912345678')    // true
isValidPhoneNumber('1234567890')    // false
```

## Integration với Forms

### React Hook Form

```jsx
import { useForm } from 'react-hook-form';
import { validateVietnamesePhone } from './utils/phoneValidator';
import PhoneInput from './components/PhoneInput';

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Số điện thoại</label>
        <input
          {...register('phone', {
            required: 'Vui lòng nhập số điện thoại',
            validate: (value) => {
              const validation = validateVietnamesePhone(value);
              return validation.isValid || validation.errorKey;
            }
          })}
          type="tel"
        />
        {errors.phone && <span>{errors.phone.message}</span>}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Formik

```jsx
import { Formik, Form, Field } from 'formik';
import { validateVietnamesePhone } from './utils/phoneValidator';

const validateForm = (values) => {
  const errors = {};
  
  const phoneValidation = validateVietnamesePhone(values.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.errorKey;
  }
  
  return errors;
};

function MyForm() {
  return (
    <Formik
      initialValues={{ phone: '' }}
      validate={validateForm}
      onSubmit={(values) => console.log(values)}
    >
      {({ errors, touched }) => (
        <Form>
          <Field name="phone" type="tel" />
          {errors.phone && touched.phone && <div>{errors.phone}</div>}
          <button type="submit">Submit</button>
        </Form>
      )}
    </Formik>
  );
}
```

## Error Messages

Các error key được sử dụng (trong `locales/vi.json`):

- `validation.phone.invalid` - Số điện thoại không hợp lệ
- `validation.phone.empty` - Số điện thoại không được để trống
- `validation.phone.format` - Sai format
- `validation.phone.invalidPrefix` - Đầu số không hợp lệ
- `validation.phone.length` - Sai độ dài
- `validation.phone.international` - Sai format quốc tế
- `validation.phone.mustStartWith` - Phải bắt đầu bằng 0 hoặc +84

## Styling

PhoneInput component có sẵn CSS. Để customize:

### Override CSS classes:

```css
/* Trong file CSS của bạn */
.phone-input {
  /* Custom styles */
}

.phone-input-error {
  /* Error state styles */
}

.phone-input-error-message {
  /* Error message styles */
}
```

### Hoặc sử dụng className prop:

```jsx
<PhoneInput
  className="my-custom-class"
  // ...other props
/>
```

## Best Practices

1. **Validate trước khi submit**: Luôn validate trước khi gửi form
2. **Normalize trước khi gửi API**: Sử dụng `getNormalizedValue()` hoặc `validation.normalized`
3. **Hiển thị lỗi rõ ràng**: Sử dụng error messages từ locales
4. **Auto-format option**: Bật `autoFormat` để tự động chuẩn hóa
5. **Validate on blur**: Để UX tốt hơn, validate khi blur thay vì onChange

## Testing

Các test case quan trọng:

```jsx
// Valid cases
validateVietnamesePhone('0912345678')     // ✅
validateVietnamesePhone('+84912345678')   // ✅
validateVietnamesePhone('091 234 5678')   // ✅
validateVietnamesePhone('091-234-5678')   // ✅

// Invalid cases
validateVietnamesePhone('1234567890')     // ❌
validateVietnamesePhone('091234567')      // ❌
validateVietnamesePhone('abc123456')      // ❌
```

## Troubleshooting

### Input không hiển thị số

Đảm bảo `type="tel"` được set:

```jsx
<input type="tel" />
```

### Validation không hoạt động

Kiểm tra i18n đã được setup chưa và locale file có đầy đủ keys chưa.

### Auto-format không hoạt động

Đảm bảo prop `autoFormat={true}` được set và onChange handler đúng cách.



