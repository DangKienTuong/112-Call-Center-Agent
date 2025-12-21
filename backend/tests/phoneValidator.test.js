/**
 * Test suite for Vietnamese phone number validation
 * 
 * Run with: node backend/tests/phoneValidator.test.js
 */

const { validateVietnamesePhone } = require('../utils/phoneValidator');

// Test cases
const testCases = [
  // Valid domestic formats
  { phone: '0912345678', expected: true, description: 'Valid 09x number' },
  { phone: '0987654321', expected: true, description: 'Valid 09x number (2)' },
  { phone: '0323456789', expected: true, description: 'Valid 03x number (Viettel)' },
  { phone: '0356789012', expected: true, description: 'Valid 03x number (2)' },
  { phone: '0701234567', expected: true, description: 'Valid 07x number' },
  { phone: '0789012345', expected: true, description: 'Valid 07x number (2)' },
  { phone: '0812345678', expected: true, description: 'Valid 08x number' },
  { phone: '0889876543', expected: true, description: 'Valid 08x number (2)' },
  { phone: '0523456789', expected: true, description: 'Valid 05x number' },
  { phone: '0567890123', expected: true, description: 'Valid 05x number (2)' },
  
  // Valid international formats
  { phone: '+84912345678', expected: true, description: 'Valid +84 format' },
  { phone: '+84323456789', expected: true, description: 'Valid +84 format (Viettel)' },
  { phone: '+84701234567', expected: true, description: 'Valid +84 format (07x)' },
  
  // Valid with formatting
  { phone: '091 234 5678', expected: true, description: 'Number with spaces' },
  { phone: '091-234-5678', expected: true, description: 'Number with dashes' },
  { phone: '(091) 234-5678', expected: true, description: 'Number with parentheses' },
  { phone: '+84 91 234 5678', expected: true, description: '+84 with spaces' },
  
  // Invalid formats
  { phone: '0112345678', expected: false, description: 'Invalid prefix 011' },
  { phone: '0212345678', expected: false, description: 'Invalid prefix 021' },
  { phone: '0412345678', expected: false, description: 'Invalid prefix 041' },
  { phone: '0612345678', expected: false, description: 'Invalid prefix 061' },
  { phone: '091234567', expected: false, description: 'Only 9 digits' },
  { phone: '09123456789', expected: false, description: '11 digits' },
  { phone: '1234567890', expected: false, description: 'Not starting with 0' },
  { phone: '+841234567890', expected: false, description: '+84 with 10 digits' },
  { phone: '+8491234567', expected: false, description: '+84 with only 8 digits' },
  { phone: '', expected: false, description: 'Empty string' },
  { phone: null, expected: false, description: 'Null value' },
  { phone: undefined, expected: false, description: 'Undefined value' },
  { phone: 'abc123456', expected: false, description: 'Contains letters' },
  { phone: '0912abc678', expected: false, description: 'Contains letters in middle' },
];

// Run tests
console.log('🧪 Testing Vietnamese Phone Number Validation\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = validateVietnamesePhone(testCase.phone);
  const success = result.isValid === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    if (result.isValid) {
      console.log(`   Input: "${testCase.phone}" → Normalized: "${result.normalized}"`);
      if (result.internationalFormat) {
        console.log(`   International: "${result.internationalFormat}"`);
      }
    }
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.phone}"`);
    console.log(`   Expected: ${testCase.expected ? 'valid' : 'invalid'}`);
    console.log(`   Got: ${result.isValid ? 'valid' : 'invalid'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}



