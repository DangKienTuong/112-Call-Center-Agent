/**
 * Vietnamese Phone Number Validator for Frontend
 * 
 * Validates phone numbers according to Vietnamese standards
 * Valid formats:
 * - 10 digits starting with 0 (09x, 03x, 07x, 08x, 05x)
 * - International format: +84 followed by 9 digits
 */

const VALID_PREFIXES = [
  // 09x series
  '090', '091', '092', '093', '094', '096', '097', '098', '099',
  // 03x series (Viettel converted)
  '032', '033', '034', '035', '036', '037', '038', '039',
  // 07x series
  '070', '076', '077', '078', '079',
  // 08x series
  '081', '082', '083', '084', '085', '086', '088', '089',
  // 05x series
  '052', '053', '054', '055', '056', '058', '059'
];

/**
 * Validate Vietnamese phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Object} - { isValid: boolean, normalized: string, errorKey: string }
 */
export const validateVietnamesePhone = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      normalized: null,
      errorKey: 'validation.phone.empty'
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
        errorKey: 'validation.phone.international'
      };
    }

    // Check if prefix is valid (without the leading 0)
    const prefix = '0' + withoutPrefix.substring(0, 2);
    if (!VALID_PREFIXES.includes(prefix)) {
      return {
        isValid: false,
        normalized: null,
        errorKey: 'validation.phone.invalidPrefix'
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
        errorKey: 'validation.phone.length'
      };
    }

    // Check if prefix is valid
    const prefix = cleaned.substring(0, 3);
    if (!VALID_PREFIXES.includes(prefix)) {
      return {
        isValid: false,
        normalized: null,
        errorKey: 'validation.phone.invalidPrefix'
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
    errorKey: 'validation.phone.mustStartWith'
  };
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number (e.g., 091 234 5678)
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/[\s\-\.()]/g, '');
  
  if (cleaned.startsWith('+84')) {
    // Format: +84 91 234 5678
    const withoutPrefix = cleaned.substring(3);
    return `+84 ${withoutPrefix.substring(0, 2)} ${withoutPrefix.substring(2, 5)} ${withoutPrefix.substring(5)}`;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Format: 091 234 5678
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  return phoneNumber;
};

/**
 * Get phone input mask pattern for HTML5 input
 * @returns {string} - Pattern for HTML5 input validation
 */
export const getPhoneInputPattern = () => {
  return '^(0[3|5|7|8|9][0-9]{8}|\\+84[3|5|7|8|9][0-9]{8})$';
};

/**
 * Check if phone number is valid (simple boolean check)
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} - True if valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  return validateVietnamesePhone(phoneNumber).isValid;
};

export default {
  validateVietnamesePhone,
  formatPhoneNumber,
  getPhoneInputPattern,
  isValidPhoneNumber,
  VALID_PREFIXES
};




