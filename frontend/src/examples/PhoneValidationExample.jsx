/**
 * Phone Validation Example Component
 * 
 * Demo component showing how to use phone validation features
 * This component can be used for testing and as a reference
 * 
 * To use: Import this component in your App.js or create a test page
 */

import React, { useState } from 'react';
import PhoneInput from '../components/PhoneInput';
import { usePhoneValidation } from '../hooks/usePhoneValidation';
import { 
  validateVietnamesePhone, 
  formatPhoneNumber,
  isValidPhoneNumber 
} from '../utils/phoneValidator';
import './PhoneValidationExample.css';

const PhoneValidationExample = () => {
  // Example 1: Using PhoneInput component
  const [phone1, setPhone1] = useState('');
  const [error1, setError1] = useState('');

  // Example 2: Using usePhoneValidation hook
  const phone2 = usePhoneValidation('', false);

  // Example 3: Manual validation
  const [phone3, setPhone3] = useState('');
  const [result3, setResult3] = useState(null);

  // Test cases for demonstration
  const testCases = [
    { value: '0912345678', label: 'Valid 09x' },
    { value: '0323456789', label: 'Valid 03x (Viettel)' },
    { value: '+84912345678', label: 'Valid +84 format' },
    { value: '091 234 5678', label: 'With spaces' },
    { value: '091-234-5678', label: 'With dashes' },
    { value: '0112345678', label: 'Invalid prefix 011' },
    { value: '091234567', label: 'Too short (9 digits)' },
  ];

  const handlePhoneInput1Change = (e) => {
    setPhone1(e.target.value);
    setError1('');
  };

  const handlePhoneInput1Blur = () => {
    const validation = validateVietnamesePhone(phone1);
    if (!validation.isValid && phone1) {
      setError1('Số điện thoại không hợp lệ');
    }
  };

  const handleSubmit1 = (e) => {
    e.preventDefault();
    const validation = validateVietnamesePhone(phone1);
    if (validation.isValid) {
      alert(`✅ Success!\nNormalized: ${validation.normalized}\nInternational: ${validation.internationalFormat}`);
    } else {
      setError1('Số điện thoại không hợp lệ');
    }
  };

  const handleSubmit2 = (e) => {
    e.preventDefault();
    if (phone2.validate()) {
      alert(`✅ Success!\nNormalized: ${phone2.getNormalizedValue()}`);
    }
  };

  const handleManualValidation = () => {
    const validation = validateVietnamesePhone(phone3);
    setResult3(validation);
  };

  const testPhoneNumber = (testPhone) => {
    const validation = validateVietnamesePhone(testPhone);
    const formatted = formatPhoneNumber(testPhone);
    alert(
      `Input: ${testPhone}\n` +
      `Valid: ${validation.isValid ? '✅' : '❌'}\n` +
      `Normalized: ${validation.normalized || 'N/A'}\n` +
      `Formatted: ${formatted || 'N/A'}\n` +
      `Error: ${validation.errorKey || 'None'}`
    );
  };

  return (
    <div className="phone-validation-example">
      <h1>Phone Validation Examples</h1>
      <p className="subtitle">Demonstration of Vietnamese phone number validation features</p>

      {/* Example 1: PhoneInput Component */}
      <section className="example-section">
        <h2>Example 1: PhoneInput Component</h2>
        <p>Ready-to-use component with built-in validation UI</p>
        
        <form onSubmit={handleSubmit1}>
          <PhoneInput
            value={phone1}
            onChange={handlePhoneInput1Change}
            onBlur={handlePhoneInput1Blur}
            error={error1}
            label="Phone Number"
            required={true}
            showHint={true}
            autoFormat={true}
          />
          <button type="submit" className="btn-primary">Submit Example 1</button>
        </form>

        <div className="code-block">
          <pre>{`<PhoneInput
  value={phone1}
  onChange={handlePhoneInput1Change}
  onBlur={handlePhoneInput1Blur}
  error={error1}
  label="Phone Number"
  required={true}
  showHint={true}
  autoFormat={true}
/>`}</pre>
        </div>
      </section>

      {/* Example 2: usePhoneValidation Hook */}
      <section className="example-section">
        <h2>Example 2: usePhoneValidation Hook</h2>
        <p>Custom hook for managing phone validation state</p>
        
        <form onSubmit={handleSubmit2}>
          <div className="form-group">
            <label htmlFor="phone2">Phone Number *</label>
            <input
              id="phone2"
              type="tel"
              value={phone2.value}
              onChange={phone2.onChange}
              onBlur={phone2.onBlur}
              className={phone2.error ? 'error' : ''}
              placeholder="Enter phone number"
            />
            {phone2.error && <span className="error-text">{phone2.error}</span>}
          </div>
          <button type="submit" className="btn-primary">Submit Example 2</button>
          <button type="button" onClick={phone2.reset} className="btn-secondary">Reset</button>
        </form>

        <div className="code-block">
          <pre>{`const phone = usePhoneValidation('', false);

<input
  value={phone.value}
  onChange={phone.onChange}
  onBlur={phone.onBlur}
/>
{phone.error && <span>{phone.error}</span>}`}</pre>
        </div>
      </section>

      {/* Example 3: Manual Validation */}
      <section className="example-section">
        <h2>Example 3: Manual Validation with Utility Functions</h2>
        <p>Direct use of validation functions</p>
        
        <div className="form-group">
          <label htmlFor="phone3">Phone Number</label>
          <input
            id="phone3"
            type="tel"
            value={phone3}
            onChange={(e) => setPhone3(e.target.value)}
            placeholder="Enter phone number to test"
          />
          <button onClick={handleManualValidation} className="btn-primary">
            Validate
          </button>
        </div>

        {result3 && (
          <div className={`validation-result ${result3.isValid ? 'valid' : 'invalid'}`}>
            <h3>Validation Result:</h3>
            <ul>
              <li><strong>Valid:</strong> {result3.isValid ? '✅ Yes' : '❌ No'}</li>
              <li><strong>Normalized:</strong> {result3.normalized || 'N/A'}</li>
              <li><strong>International:</strong> {result3.internationalFormat || 'N/A'}</li>
              <li><strong>Error Key:</strong> {result3.errorKey || 'None'}</li>
              <li><strong>Formatted:</strong> {formatPhoneNumber(phone3) || 'N/A'}</li>
            </ul>
          </div>
        )}

        <div className="code-block">
          <pre>{`import { validateVietnamesePhone } from '../utils/phoneValidator';

const validation = validateVietnamesePhone(phoneNumber);
console.log(validation);
// {
//   isValid: true,
//   normalized: '0912345678',
//   internationalFormat: '+84912345678'
// }`}</pre>
        </div>
      </section>

      {/* Test Cases */}
      <section className="example-section">
        <h2>Test Cases</h2>
        <p>Click on any test case to see validation result</p>
        
        <div className="test-cases-grid">
          {testCases.map((test, index) => (
            <button
              key={index}
              onClick={() => testPhoneNumber(test.value)}
              className="test-case-btn"
            >
              <span className="test-label">{test.label}</span>
              <code>{test.value}</code>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Reference */}
      <section className="example-section">
        <h2>Quick Reference</h2>
        
        <div className="reference-grid">
          <div className="reference-card">
            <h3>Valid Prefixes</h3>
            <ul>
              <li><code>09x</code> - 090-099</li>
              <li><code>03x</code> - 032-039</li>
              <li><code>07x</code> - 070, 076-079</li>
              <li><code>08x</code> - 081-089</li>
              <li><code>05x</code> - 052-059</li>
            </ul>
          </div>

          <div className="reference-card">
            <h3>Valid Formats</h3>
            <ul>
              <li>Domestic: <code>0912345678</code></li>
              <li>International: <code>+84912345678</code></li>
              <li>With spaces: <code>091 234 5678</code></li>
              <li>With dashes: <code>091-234-5678</code></li>
            </ul>
          </div>

          <div className="reference-card">
            <h3>Utility Functions</h3>
            <ul>
              <li><code>validateVietnamesePhone()</code></li>
              <li><code>formatPhoneNumber()</code></li>
              <li><code>isValidPhoneNumber()</code></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PhoneValidationExample;



