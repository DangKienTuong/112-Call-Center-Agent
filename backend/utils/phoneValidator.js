/**
 * Validate Vietnamese phone numbers
 * 
 * Valid formats:
 * - 10 digits starting with valid prefixes (09x, 03x, 07x, 08x, 05x)
 * - International format: +84 followed by 9 digits (without leading 0)
 * 
 * Valid prefixes in Vietnam (as of 2024):
 * - 09x: 090-099 (Mobifone, Vietnamobile, Vinaphone, Gmobile)
 * - 03x: 032, 033, 034, 035, 036, 037, 038, 039 (Viettel, Mobifone, Vinaphone)
 * - 07x: 070, 076, 077, 078, 079 (Viettel, Mobifone, Gmobile)
 * - 08x: 081, 082, 083, 084, 085, 086, 088, 089 (Vinaphone, Vietnamobile)
 * - 05x: 052, 053, 054, 055, 056, 058, 059 (Vietnamobile, Vinaphone)
 */

const VALID_PREFIXES = [
  // 09x series
  '090', '091', '092', '093', '094', '096', '097', '098', '099',
  // 03x series (Viettel converted from 016x, 017x, 018x, 019x)
  '032', '033', '034', '035', '036', '037', '038', '039',
  // 07x series (Viettel and others)
  '070', '076', '077', '078', '079',
  // 08x series (Vinaphone, Vietnamobile)
  '081', '082', '083', '084', '085', '086', '088', '089',
  // 05x series (Vietnamobile)
  '052', '053', '054', '055', '056', '058', '059'
];

/**
 * Validate Vietnamese phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Object} - { isValid: boolean, normalized: string, error: string }
 */
function validateVietnamesePhone(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      normalized: null,
      error: 'Số điện thoại không được để trống'
    };
  }

  // Remove all whitespace and special characters except +
  const cleaned = phoneNumber.trim().replace(/[\s\-\.()]/g, '');

  // Check for international format (+84...)
  if (cleaned.startsWith('+84')) {
    const withoutPrefix = cleaned.substring(3);
    
    // Must have exactly 9 digits after +84
    if (!/^\d{9}$/.test(withoutPrefix)) {
      return {
        isValid: false,
        normalized: null,
        error: 'Số điện thoại quốc tế phải có định dạng +84 theo sau bởi 9 chữ số (ví dụ: +84912345678)'
      };
    }

    // Check if prefix is valid (without the leading 0)
    const prefix = '0' + withoutPrefix.substring(0, 2);
    if (!VALID_PREFIXES.includes(prefix)) {
      return {
        isValid: false,
        normalized: null,
        error: `Đầu số ${prefix} không hợp lệ tại Việt Nam`
      };
    }

    // Normalize to domestic format (with leading 0)
    return {
      isValid: true,
      normalized: '0' + withoutPrefix,
      internationalFormat: cleaned
    };
  }

  // Check for domestic format (10 digits starting with 0)
  if (cleaned.startsWith('0')) {
    // Must have exactly 10 digits
    if (!/^0\d{9}$/.test(cleaned)) {
      return {
        isValid: false,
        normalized: null,
        error: 'Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng số 0'
      };
    }

    // Check if prefix is valid
    const prefix = cleaned.substring(0, 3);
    if (!VALID_PREFIXES.includes(prefix)) {
      return {
        isValid: false,
        normalized: null,
        error: `Đầu số ${prefix} không hợp lệ tại Việt Nam. Các đầu số hợp lệ: 09x, 03x, 07x, 08x, 05x`
      };
    }

    // Valid domestic format
    return {
      isValid: true,
      normalized: cleaned,
      internationalFormat: '+84' + cleaned.substring(1)
    };
  }

  // If doesn't start with 0 or +84
  return {
    isValid: false,
    normalized: null,
    error: 'Số điện thoại phải bắt đầu bằng 0 (10 chữ số) hoặc +84 (9 chữ số)'
  };
}

/**
 * Express middleware to validate phone number in request body
 * @param {string} fieldPath - Path to phone field in request body (e.g., 'reporter.phone')
 */
function validatePhoneMiddleware(fieldPath = 'phone') {
  return (req, res, next) => {
    const pathParts = fieldPath.split('.');
    let phoneValue = req.body;
    
    // Navigate through nested object
    for (const part of pathParts) {
      if (phoneValue && typeof phoneValue === 'object') {
        phoneValue = phoneValue[part];
      } else {
        phoneValue = undefined;
        break;
      }
    }

    const validation = validateVietnamesePhone(phoneValue);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ',
        error: validation.error,
        field: fieldPath
      });
    }

    // Normalize the phone number in the request body
    let target = req.body;
    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]];
    }
    target[pathParts[pathParts.length - 1]] = validation.normalized;

    // Store normalized phone for later use
    req.normalizedPhone = validation.normalized;
    req.internationalPhone = validation.internationalFormat;

    next();
  };
}

module.exports = {
  validateVietnamesePhone,
  validatePhoneMiddleware,
  VALID_PREFIXES
};



