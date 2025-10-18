import type { PaymentFormData, ValidationResult, FormErrors } from './types';

// Card number validation
export function validateCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{13,19}$/.test(cleanNumber)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Get card type from card number
export function getCardType(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (/^4/.test(cleanNumber)) return 'Visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'American Express';
  if (/^6/.test(cleanNumber)) return 'Discover';
  
  return 'Unknown';
}

// Format card number with spaces
export function formatCardNumber(value: string): string {
  const cleanValue = value.replace(/\s/g, '');
  const groups = cleanValue.match(/.{1,4}/g) || [];
  return groups.join(' ').substr(0, 19); // Max 16 digits + 3 spaces
}

// Format expiry date MM/YY
export function formatExpiryDate(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length >= 2) {
    return cleanValue.substring(0, 2) + '/' + cleanValue.substring(2, 4);
  }
  return cleanValue;
}

// Format cardholder name (remove non-alphabetic characters)
export function formatCardholderName(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '');
}

// Validate expiry date
export function validateExpiryDate(expiryDate: string): boolean {
  const match = expiryDate.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = parseInt(match[1]);
  const year = parseInt(match[2]) + 2000;
  
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const expiry = new Date(year, month - 1);
  
  return expiry > now;
}

// Validate CVV
export function validateCVV(cvv: string, cardType: string): boolean {
  const cleanCVV = cvv.replace(/\D/g, '');
  
  if (cardType === 'American Express') {
    return /^\d{4}$/.test(cleanCVV);
  }
  
  return /^\d{3}$/.test(cleanCVV);
}

// Validate cardholder name
export function validateCardholderName(name: string): boolean {
  return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name.trim());
}

// Validate billing address
export function validateBillingAddress(address: PaymentFormData['billingAddress']): FormErrors {
  const errors: FormErrors = {};

  if (!address.street.trim()) {
    errors.street = 'Street address is required';
  }

  if (!address.city.trim()) {
    errors.city = 'City is required';
  }

  if (!address.state.trim()) {
    errors.state = 'State is required';
  }

  if (!/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
    errors.zipCode = 'Please enter a valid ZIP code';
  }

  if (!address.country.trim()) {
    errors.country = 'Country is required';
  }

  return errors;
}

// Main payment form validation
export function validatePaymentForm(data: PaymentFormData): ValidationResult {
  const errors: FormErrors = {};

  // Card number validation
  if (!data.cardNumber.trim()) {
    errors.cardNumber = 'Card number is required';
  } else if (!validateCardNumber(data.cardNumber)) {
    errors.cardNumber = 'Please enter a valid card number';
  }

  // Expiry date validation
  if (!data.expiryDate.trim()) {
    errors.expiryDate = 'Expiry date is required';
  } else if (!validateExpiryDate(data.expiryDate)) {
    errors.expiryDate = 'Please enter a valid expiry date';
  }

  // CVV validation
  const cardType = getCardType(data.cardNumber);
  if (!data.cvv.trim()) {
    errors.cvv = 'CVV is required';
  } else if (!validateCVV(data.cvv, cardType)) {
    errors.cvv = cardType === 'American Express' ? 'CVV must be 4 digits' : 'CVV must be 3 digits';
  }

  // Cardholder name validation
  if (!data.cardholderName.trim()) {
    errors.cardholderName = 'Cardholder name is required';
  } else if (!validateCardholderName(data.cardholderName)) {
    errors.cardholderName = 'Please enter a valid name';
  }

  // Billing address validation
  const addressErrors = validateBillingAddress(data.billingAddress);
  Object.assign(errors, addressErrors);

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 255); // Limit length
}

// Mask sensitive data for logging
export function maskCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (cleanNumber.length < 4) return '****';
  return '**** **** **** ' + cleanNumber.slice(-4);
}
