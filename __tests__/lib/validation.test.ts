import {
  validateCardNumber,
  getCardType,
  formatCardNumber,
  formatExpiryDate,
  validateExpiryDate,
  validateCVV,
  validateCardholderName,
  validateBillingAddress,
  validatePaymentForm,
  sanitizeInput,
  maskCardNumber,
} from '@/lib/validation'
import type { PaymentFormData } from '@/lib/types'

describe('Card Number Validation', () => {
  describe('validateCardNumber', () => {
    test('should validate valid card numbers using Luhn algorithm', () => {
      // Valid test card numbers
      expect(validateCardNumber('4532015112830366')).toBe(true) // Visa
      expect(validateCardNumber('5555555555554444')).toBe(true) // Mastercard
      expect(validateCardNumber('378282246310005')).toBe(true) // American Express
      expect(validateCardNumber('6011111111111117')).toBe(true) // Discover
    })

    test('should validate card numbers with spaces', () => {
      expect(validateCardNumber('4532 0151 1283 0366')).toBe(true)
      expect(validateCardNumber('5555 5555 5555 4444')).toBe(true)
    })

    test('should reject invalid card numbers', () => {
      expect(validateCardNumber('1234567890123456')).toBe(false)
      expect(validateCardNumber('4532015112830367')).toBe(false) // Wrong check digit
      expect(validateCardNumber('')).toBe(false)
      expect(validateCardNumber('123')).toBe(false) // Too short
      expect(validateCardNumber('12345678901234567890')).toBe(false) // Too long
    })

    test('should reject non-numeric characters', () => {
      expect(validateCardNumber('4532-0151-1283-0366')).toBe(false)
      expect(validateCardNumber('4532a15112830366')).toBe(false)
      expect(validateCardNumber('abcd efgh ijkl mnop')).toBe(false)
    })
  })

  describe('getCardType', () => {
    test('should identify Visa cards', () => {
      expect(getCardType('4532015112830366')).toBe('Visa')
      expect(getCardType('4000000000000002')).toBe('Visa')
      expect(getCardType('4')).toBe('Visa')
    })

    test('should identify Mastercard', () => {
      expect(getCardType('5555555555554444')).toBe('Mastercard')
      expect(getCardType('5105105105105100')).toBe('Mastercard')
      expect(getCardType('51')).toBe('Mastercard')
    })

    test('should identify American Express', () => {
      expect(getCardType('378282246310005')).toBe('American Express')
      expect(getCardType('371449635398431')).toBe('American Express')
      expect(getCardType('34')).toBe('American Express')
      expect(getCardType('37')).toBe('American Express')
    })

    test('should identify Discover', () => {
      expect(getCardType('6011111111111117')).toBe('Discover')
      expect(getCardType('6011000990139424')).toBe('Discover')
      expect(getCardType('6')).toBe('Discover')
    })

    test('should return Unknown for unrecognized patterns', () => {
      expect(getCardType('1234567890123456')).toBe('Unknown')
      expect(getCardType('9999999999999999')).toBe('Unknown')
      expect(getCardType('')).toBe('Unknown')
    })
  })

  describe('formatCardNumber', () => {
    test('should format card numbers with spaces', () => {
      expect(formatCardNumber('4532015112830366')).toBe('4532 0151 1283 0366')
      expect(formatCardNumber('378282246310005')).toBe('3782 8224 6310 005')
    })

    test('should handle partial card numbers', () => {
      expect(formatCardNumber('4532')).toBe('4532')
      expect(formatCardNumber('45320151')).toBe('4532 0151')
      expect(formatCardNumber('453201511283')).toBe('4532 0151 1283')
    })

    test('should remove existing spaces before formatting', () => {
      expect(formatCardNumber('4532 0151 1283 0366')).toBe('4532 0151 1283 0366')
    })

    test('should limit to maximum length', () => {
      expect(formatCardNumber('45320151128303661234')).toBe('4532 0151 1283 0366')
    })
  })
})

describe('Expiry Date Validation', () => {
  describe('formatExpiryDate', () => {
    test('should format expiry date with slash', () => {
      expect(formatExpiryDate('1225')).toBe('12/25')
      expect(formatExpiryDate('0124')).toBe('01/24')
    })

    test('should handle partial input', () => {
      expect(formatExpiryDate('1')).toBe('1')
      expect(formatExpiryDate('12')).toBe('12/')
      expect(formatExpiryDate('123')).toBe('12/3')
    })

    test('should remove non-numeric characters', () => {
      expect(formatExpiryDate('12/25')).toBe('12/25')
      expect(formatExpiryDate('12a25')).toBe('12/25')
      expect(formatExpiryDate('ab/cd')).toBe('')
    })

    test('should limit to 4 digits', () => {
      expect(formatExpiryDate('122567')).toBe('12/25')
    })
  })

  describe('validateExpiryDate', () => {
    test('should validate future dates', () => {
      const futureYear = new Date().getFullYear() + 5
      const futureYearShort = futureYear.toString().slice(-2)
      expect(validateExpiryDate(`12/${futureYearShort}`)).toBe(true)
    })

    test('should reject past dates', () => {
      expect(validateExpiryDate('12/20')).toBe(false) // Assuming current year > 2020
      expect(validateExpiryDate('01/21')).toBe(false)
    })

    test('should reject invalid months', () => {
      const futureYear = new Date().getFullYear() + 1
      const futureYearShort = futureYear.toString().slice(-2)
      expect(validateExpiryDate(`00/${futureYearShort}`)).toBe(false)
      expect(validateExpiryDate(`13/${futureYearShort}`)).toBe(false)
    })

    test('should reject invalid format', () => {
      expect(validateExpiryDate('1225')).toBe(false)
      expect(validateExpiryDate('12-25')).toBe(false)
      expect(validateExpiryDate('12/2025')).toBe(false)
      expect(validateExpiryDate('')).toBe(false)
    })
  })
})

describe('CVV Validation', () => {
  describe('validateCVV', () => {
    test('should validate 3-digit CVV for most cards', () => {
      expect(validateCVV('123', 'Visa')).toBe(true)
      expect(validateCVV('456', 'Mastercard')).toBe(true)
      expect(validateCVV('789', 'Discover')).toBe(true)
    })

    test('should validate 4-digit CVV for American Express', () => {
      expect(validateCVV('1234', 'American Express')).toBe(true)
    })

    test('should reject wrong length CVV', () => {
      expect(validateCVV('12', 'Visa')).toBe(false)
      expect(validateCVV('1234', 'Visa')).toBe(false)
      expect(validateCVV('123', 'American Express')).toBe(false)
      expect(validateCVV('12345', 'American Express')).toBe(false)
    })

    test('should reject non-numeric CVV', () => {
      expect(validateCVV('12a', 'Visa')).toBe(false)
      expect(validateCVV('abc', 'Visa')).toBe(false)
      expect(validateCVV('', 'Visa')).toBe(false)
    })
  })
})

describe('Cardholder Name Validation', () => {
  describe('validateCardholderName', () => {
    test('should validate proper names', () => {
      expect(validateCardholderName('John Doe')).toBe(true)
      expect(validateCardholderName('Mary Jane Smith')).toBe(true)
      expect(validateCardholderName('Jean-Luc Picard')).toBe(false) // Contains hyphen
      expect(validateCardholderName('John')).toBe(true) // Single name
    })

    test('should reject names that are too short', () => {
      expect(validateCardholderName('J')).toBe(false)
      expect(validateCardholderName('')).toBe(false)
      expect(validateCardholderName('  ')).toBe(false)
    })

    test('should reject names with numbers or special characters', () => {
      expect(validateCardholderName('John123')).toBe(false)
      expect(validateCardholderName('John@Doe')).toBe(false)
      expect(validateCardholderName('John.Doe')).toBe(false)
    })

    test('should handle whitespace properly', () => {
      expect(validateCardholderName('  John Doe  ')).toBe(true)
      expect(validateCardholderName('John  Doe')).toBe(true) // Multiple spaces
    })
  })
})

describe('Billing Address Validation', () => {
  describe('validateBillingAddress', () => {
    const validAddress = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US'
    }

    test('should validate complete address', () => {
      const result = validateBillingAddress(validAddress)
      expect(Object.keys(result)).toHaveLength(0)
    })

    test('should require street address', () => {
      const result = validateBillingAddress({ ...validAddress, street: '' })
      expect(result.street).toBe('Street address is required')
    })

    test('should require city', () => {
      const result = validateBillingAddress({ ...validAddress, city: '' })
      expect(result.city).toBe('City is required')
    })

    test('should require state', () => {
      const result = validateBillingAddress({ ...validAddress, state: '' })
      expect(result.state).toBe('State is required')
    })

    test('should validate ZIP code format', () => {
      expect(validateBillingAddress({ ...validAddress, zipCode: '12345' })).toEqual({})
      expect(validateBillingAddress({ ...validAddress, zipCode: '12345-6789' })).toEqual({})
      
      const invalidZip = validateBillingAddress({ ...validAddress, zipCode: '123' })
      expect(invalidZip.zipCode).toBe('Please enter a valid ZIP code')
      
      const invalidZip2 = validateBillingAddress({ ...validAddress, zipCode: 'ABCDE' })
      expect(invalidZip2.zipCode).toBe('Please enter a valid ZIP code')
    })

    test('should require country', () => {
      const result = validateBillingAddress({ ...validAddress, country: '' })
      expect(result.country).toBe('Country is required')
    })
  })
})

describe('Complete Form Validation', () => {
  describe('validatePaymentForm', () => {
    const validFormData: PaymentFormData = {
      cardNumber: '4532015112830366',
      expiryDate: '12/25',
      cvv: '123',
      cardholderName: 'John Doe',
      billingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US'
      }
    }

    test('should validate complete valid form', () => {
      const result = validatePaymentForm(validFormData)
      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    test('should validate American Express CVV', () => {
      const amexData = {
        ...validFormData,
        cardNumber: '378282246310005',
        cvv: '1234'
      }
      const result = validatePaymentForm(amexData)
      expect(result.isValid).toBe(true)
    })

    test('should reject form with multiple errors', () => {
      const invalidData: PaymentFormData = {
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        billingAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        }
      }

      const result = validatePaymentForm(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.cardNumber).toBeDefined()
      expect(result.errors.expiryDate).toBeDefined()
      expect(result.errors.cvv).toBeDefined()
      expect(result.errors.cardholderName).toBeDefined()
      expect(result.errors.street).toBeDefined()
      expect(result.errors.city).toBeDefined()
      expect(result.errors.state).toBeDefined()
      expect(result.errors.zipCode).toBeDefined()
      expect(result.errors.country).toBeDefined()
    })

    test('should validate CVV length based on card type', () => {
      // Visa with 4-digit CVV should fail
      const visaInvalid = { ...validFormData, cvv: '1234' }
      expect(validatePaymentForm(visaInvalid).isValid).toBe(false)

      // American Express with 3-digit CVV should fail
      const amexInvalid = {
        ...validFormData,
        cardNumber: '378282246310005',
        cvv: '123'
      }
      expect(validatePaymentForm(amexInvalid).isValid).toBe(false)
    })
  })
})

describe('Utility Functions', () => {
  describe('sanitizeInput', () => {
    test('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
      expect(sanitizeInput('Normal text')).toBe('Normal text')
      expect(sanitizeInput('Text with > and < brackets')).toBe('Text with  and  brackets')
    })

    test('should trim whitespace', () => {
      expect(sanitizeInput('  text  ')).toBe('text')
    })

    test('should limit length', () => {
      const longString = 'a'.repeat(300)
      expect(sanitizeInput(longString)).toHaveLength(255)
    })
  })

  describe('maskCardNumber', () => {
    test('should mask card number showing only last 4 digits', () => {
      expect(maskCardNumber('4532015112830366')).toBe('**** **** **** 0366')
      expect(maskCardNumber('4532 0151 1283 0366')).toBe('**** **** **** 0366')
    })

    test('should handle short numbers', () => {
      expect(maskCardNumber('123')).toBe('****')
      expect(maskCardNumber('')).toBe('****')
    })
  })
})


