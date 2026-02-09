import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { validateVietnamesePhone } from '../utils/phoneValidator';

/**
 * Custom hook for phone number validation
 * 
 * @param {string} initialValue - Initial phone number value
 * @param {boolean} validateOnChange - Whether to validate on every change (default: true)
 * @returns {Object} - { value, error, isValid, onChange, onBlur, validate, reset }
 * 
 * @example
 * const phone = usePhoneValidation('', true);
 * 
 * <input
 *   value={phone.value}
 *   onChange={phone.onChange}
 *   onBlur={phone.onBlur}
 * />
 * {phone.error && <span className="error">{phone.error}</span>}
 */
export const usePhoneValidation = (initialValue = '', validateOnChange = false) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (touched || validateOnChange) {
      validate(value);
    }
  }, [value, touched, validateOnChange]);

  const validate = (phoneValue) => {
    if (!phoneValue || phoneValue.trim() === '') {
      setError(t('validation.phone.empty'));
      setIsValid(false);
      return false;
    }

    const validation = validateVietnamesePhone(phoneValue);
    
    if (!validation.isValid) {
      setError(t(validation.errorKey));
      setIsValid(false);
      return false;
    }

    setError('');
    setIsValid(true);
    return true;
  };

  const onChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (validateOnChange && touched) {
      validate(newValue);
    }
  };

  const onBlur = () => {
    setTouched(true);
    validate(value);
  };

  const reset = () => {
    setValue(initialValue);
    setError('');
    setTouched(false);
    setIsValid(false);
  };

  const getNormalizedValue = () => {
    const validation = validateVietnamesePhone(value);
    return validation.isValid ? validation.normalized : value;
  };

  return {
    value,
    error,
    isValid,
    touched,
    onChange,
    onBlur,
    validate: () => validate(value),
    reset,
    getNormalizedValue,
    setValue
  };
};

export default usePhoneValidation;




