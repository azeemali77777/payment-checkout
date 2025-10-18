'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import type { 
  PaymentFormData, 
  ValidationResult, 
  LoadingState,
  Cart,
  PaymentResponse 
} from '@/lib/types';
import { 
  validatePaymentForm, 
  formatCardNumber, 
  formatExpiryDate, 
  formatCardholderName,
  getCardType, 
  sanitizeInput 
} from '@/lib/validation';
import { debounce } from '@/lib/utils';

interface PaymentFormProps {
  cart: Cart;
  onPaymentSuccess: (response: PaymentResponse) => void;
  onPaymentError: (error: string) => void;
}

const initialFormData: PaymentFormData = {
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  cardholderName: '',
  billingAddress: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  }
};

const PaymentForm = memo(({ cart, onPaymentSuccess, onPaymentError }: PaymentFormProps) => {
  const [formData, setFormData] = useState<PaymentFormData>(initialFormData);
  const [errors, setErrors] = useState<ValidationResult['errors']>({});
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Memoized card type detection
  const cardType = useMemo(() => getCardType(formData.cardNumber), [formData.cardNumber]);

  // Debounced validation
  const debouncedValidation = useCallback(
    debounce((data: PaymentFormData) => {
      const validation = validatePaymentForm(data);
      setErrors(validation.errors);
    }, 300),
    []
  );

  // Handle input changes with formatting and validation
  const handleInputChange = useCallback((field: string, value: string) => {
    let formattedValue = sanitizeInput(value);

    // Apply specific formatting
    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(formattedValue);
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(formattedValue);
    } else if (field === 'cvv') {
      formattedValue = formattedValue.replace(/\D/g, '').substring(0, 4);
    } else if (field === 'cardholderName') {
      formattedValue = formatCardholderName(formattedValue);
    }

    setFormData(prev => {
      const newData = field.includes('.')
        ? {
            ...prev,
            billingAddress: {
              ...prev.billingAddress,
              [field.split('.')[1]]: formattedValue
            }
          }
        : {
            ...prev,
            [field]: formattedValue
          };
      
      // Trigger debounced validation
      debouncedValidation(newData);
      return newData;
    });

    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));
  }, [debouncedValidation]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allFields = [
      'cardNumber', 'expiryDate', 'cvv', 'cardholderName',
      'billingAddress.street', 'billingAddress.city', 
      'billingAddress.state', 'billingAddress.zipCode'
    ];
    setTouched(Object.fromEntries(allFields.map(field => [field, true])));

    // Validate form
    const validation = validatePaymentForm(formData);
    setErrors(validation.errors);

    if (!validation.isValid) {
      onPaymentError('Please correct the errors in the form');
      return;
    }

    setLoadingState('loading');

    try {
      // Prepare payment data (exclude sensitive CVV from request)
      const paymentData = {
        cart,
        payment: {
          cardNumber: formData.cardNumber,
          expiryDate: formData.expiryDate,
          cardholderName: formData.cardholderName,
          billingAddress: formData.billingAddress,
          cardNumberLast4: formData.cardNumber.replace(/\s/g, '').slice(-4),
          cardType
        }
      };

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result: PaymentResponse = await response.json();

      if (result.success) {
        setLoadingState('success');
        onPaymentSuccess(result);
      } else {
        setLoadingState('error');
        onPaymentError(result.error || 'Payment failed');
      }
    } catch (_error) {
      setLoadingState('error');
      onPaymentError('Network error. Please try again.');
    }
  }, [formData, cart, cardType, onPaymentSuccess, onPaymentError]);

  // Check if form is valid for submit button state
  const isFormValid = useMemo(() => {
    const validation = validatePaymentForm(formData);
    return validation.isValid;
  }, [formData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <span>Payment Information</span>
          {cardType !== 'Unknown' && (
            <span className="text-sm font-normal text-gray-500">
              ({cardType})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Card Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Card Details</h3>
            
            <Input
              label="Card Number"
              type="text"
              value={formData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', e.target.value)}
              error={touched.cardNumber ? errors.cardNumber : undefined}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
              autoComplete="cc-number"
              aria-describedby="card-number-help"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Date"
                type="text"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                error={touched.expiryDate ? errors.expiryDate : undefined}
                placeholder="MM/YY"
                maxLength={5}
                required
                autoComplete="cc-exp"
              />
              
              <Input
                label="CVV"
                type="password"
                value={formData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value)}
                error={touched.cvv ? errors.cvv : undefined}
                placeholder={cardType === 'American Express' ? '1234' : '123'}
                maxLength={cardType === 'American Express' ? 4 : 3}
                required
                autoComplete="cc-csc"
                helperText="3-4 digit security code"
              />
            </div>

            <Input
              label="Cardholder Name"
              type="text"
              value={formData.cardholderName}
              onChange={(e) => handleInputChange('cardholderName', e.target.value)}
              error={touched.cardholderName ? errors.cardholderName : undefined}
              placeholder="John Doe"
              required
              autoComplete="cc-name"
            />
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Billing Address</h3>
            
            <Input
              label="Street Address"
              type="text"
              value={formData.billingAddress.street}
              onChange={(e) => handleInputChange('billingAddress.street', e.target.value)}
              error={touched['billingAddress.street'] ? errors.street : undefined}
              placeholder="123 Main St"
              required
              autoComplete="street-address"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                type="text"
                value={formData.billingAddress.city}
                onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                error={touched['billingAddress.city'] ? errors.city : undefined}
                placeholder="New York"
                required
                autoComplete="address-level2"
              />
              
              <Input
                label="State"
                type="text"
                value={formData.billingAddress.state}
                onChange={(e) => handleInputChange('billingAddress.state', e.target.value)}
                error={touched['billingAddress.state'] ? errors.state : undefined}
                placeholder="NY"
                required
                autoComplete="address-level1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ZIP Code"
                type="text"
                value={formData.billingAddress.zipCode}
                onChange={(e) => handleInputChange('billingAddress.zipCode', e.target.value)}
                error={touched['billingAddress.zipCode'] ? errors.zipCode : undefined}
                placeholder="10001"
                required
                autoComplete="postal-code"
              />
              
              <Input
                label="Country"
                type="text"
                value={formData.billingAddress.country}
                onChange={(e) => handleInputChange('billingAddress.country', e.target.value)}
                error={touched['billingAddress.country'] ? errors.country : undefined}
                placeholder="US"
                required
                autoComplete="country"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loadingState === 'loading'}
            disabled={!isFormValid || loadingState === 'loading'}
          >
            {loadingState === 'loading' 
              ? 'Processing Payment...' 
              : `Pay ${cart.total ? `$${cart.total.toFixed(2)}` : ''}`
            }
          </Button>

          {/* Security Notice */}
          <Alert>
            <AlertDescription>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-sm">
                  Your payment information is encrypted and secure. We never store your CVV.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
});

PaymentForm.displayName = 'PaymentForm';

export { PaymentForm };
