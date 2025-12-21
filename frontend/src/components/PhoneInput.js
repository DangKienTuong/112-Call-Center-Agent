import React from 'react';
import { useTranslation } from 'react-i18next';
import { validateVietnamesePhone, formatPhoneNumber } from '../utils/phoneValidator';
import './PhoneInput.css';

/**
 * PhoneInput component with Vietnamese phone validation
 * 
 * @param {Object} props
 * @param {string} props.value - Phone number value
 * @param {Function} props.onChange - Change handler
 * @param {Function} props.onBlur - Blur handler
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether field is required
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {string} props.label - Label text
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.name - Input name attribute
 * @param {string} props.id - Input id attribute
 * @param {boolean} props.showHint - Show validation hint
 * @param {boolean} props.autoFormat - Auto format on blur
 */
const PhoneInput = ({
  value = '',
  onChange,
  onBlur,
  error = '',
  required = false,
  disabled = false,
  label = '',
  placeholder = '',
  name = 'phone',
  id = 'phone',
  showHint = true,
  autoFormat = false,
  className = ''
}) => {
  const { t } = useTranslation();

  const handleBlur = (e) => {
    if (autoFormat && value) {
      const validation = validateVietnamesePhone(value);
      if (validation.isValid && validation.normalized !== value) {
        // Auto-format to normalized value
        const syntheticEvent = {
          target: {
            name,
            value: validation.normalized
          }
        };
        onChange(syntheticEvent);
      }
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  const inputClassName = `phone-input ${error ? 'phone-input-error' : ''} ${className}`;

  return (
    <div className="phone-input-container">
      {label && (
        <label htmlFor={id} className="phone-input-label">
          {label}
          {required && <span className="required-asterisk"> *</span>}
        </label>
      )}
      
      <div className="phone-input-wrapper">
        <input
          type="tel"
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          placeholder={placeholder || t('validation.phone.validExamples')}
          required={required}
          disabled={disabled}
          className={inputClassName}
          autoComplete="tel"
        />
        
        {showHint && !error && !value && (
          <div className="phone-input-hint">
            {t('validation.phone.hint')}
          </div>
        )}
        
        {error && (
          <div className="phone-input-error-message">
            <svg 
              className="error-icon" 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="currentColor"
            >
              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneInput;



