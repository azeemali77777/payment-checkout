import { NextRequest, NextResponse } from 'next/server';
import type { PaymentRequest, PaymentResponse } from '@/lib/types';
import { validatePaymentForm, sanitizeInput } from '@/lib/validation';
import { generateTransactionId, simulateNetworkDelay } from '@/lib/utils';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 5;

  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function validateRequest(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.cart || !data.payment) {
    errors.push('Missing required data');
    return { isValid: false, errors };
  }

  // Validate cart
  if (!Array.isArray(data.cart.items) || data.cart.items.length === 0) {
    errors.push('Cart is empty');
  }

  if (typeof data.cart.total !== 'number' || data.cart.total <= 0) {
    errors.push('Invalid cart total');
  }

  // Validate payment data structure
  const requiredPaymentFields = [
    'cardNumber', 'expiryDate', 'cardholderName', 
    'cardNumberLast4', 'cardType', 'billingAddress'
  ];

  for (const field of requiredPaymentFields) {
    if (!data.payment[field]) {
      errors.push(`Missing payment field: ${field}`);
    }
  }

  // Validate billing address
  if (data.payment.billingAddress) {
    const requiredAddressFields = ['street', 'city', 'state', 'zipCode', 'country'];
    for (const field of requiredAddressFields) {
      if (!data.payment.billingAddress[field]) {
        errors.push(`Missing billing address field: ${field}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Simulate payment processing
async function processPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
  // Simulate network delay
  await simulateNetworkDelay(1500 + Math.random() * 1000);

  // Mock payment scenarios based on card number
  const cardNumber = paymentData.payment.cardNumber.replace(/\s/g, '');
  
  // Test scenarios
  if (cardNumber.endsWith('0000')) {
    return {
      success: false,
      message: 'Payment declined',
      error: 'Insufficient funds'
    };
  }

  if (cardNumber.endsWith('1111')) {
    return {
      success: false,
      message: 'Payment declined',
      error: 'Card expired'
    };
  }

  if (cardNumber.endsWith('2222')) {
    return {
      success: false,
      message: 'Payment declined',
      error: 'Invalid card number'
    };
  }

  if (Math.random() < 0.05) {
    return {
      success: false,
      message: 'Payment processing error',
      error: 'Temporary service unavailable'
    };
  }

  // Success case
  return {
    success: true,
    transactionId: generateTransactionId(),
    message: 'Payment processed successfully'
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many payment attempts. Please try again later.',
          message: 'Rate limit exceeded'
        },
        { status: 429 }
      );
    }

    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format',
          message: 'Failed to parse request body'
        },
        { status: 400 }
      );
    }

    // Validate request structure
    const validation = validateRequest(requestData);
    if (!validation.isValid) {
      console.error('Payment validation failed:', validation.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          message: 'Request validation failed'
        },
        { status: 400 }
      );
    }

    // Sanitize input data
    const sanitizedData: PaymentRequest = {
      cart: requestData.cart,
      payment: {
        ...requestData.payment,
        cardholderName: sanitizeInput(requestData.payment.cardholderName),
        billingAddress: {
          street: sanitizeInput(requestData.payment.billingAddress.street),
          city: sanitizeInput(requestData.payment.billingAddress.city),
          state: sanitizeInput(requestData.payment.billingAddress.state),
          zipCode: sanitizeInput(requestData.payment.billingAddress.zipCode),
          country: sanitizeInput(requestData.payment.billingAddress.country),
        }
      }
    };

    // Additional server-side validation
    const paymentFormData = {
      cardNumber: sanitizedData.payment.cardNumber,
      expiryDate: sanitizedData.payment.expiryDate,
      cvv: '123', // Mock CVV for validation (not sent from client)
      cardholderName: sanitizedData.payment.cardholderName,
      billingAddress: sanitizedData.payment.billingAddress
    };

    const formValidation = validatePaymentForm(paymentFormData);
    if (!formValidation.isValid) {
      console.error('Server-side validation failed:', formValidation.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment information is invalid',
          message: 'Server-side validation failed'
        },
        { status: 400 }
      );
    }

    // Log payment attempt (without sensitive data)
    console.log('Payment attempt:', {
      timestamp: new Date().toISOString(),
      ip: ip.substring(0, 10) + '...', // Partial IP for privacy
      cardType: sanitizedData.payment.cardType,
      cardLast4: sanitizedData.payment.cardNumberLast4,
      amount: sanitizedData.cart.total,
      itemCount: sanitizedData.cart.items.length
    });

    // Process payment
    const paymentResult = await processPayment(sanitizedData);

    // Log result (without sensitive data)
    console.log('Payment result:', {
      success: paymentResult.success,
      transactionId: paymentResult.transactionId,
      message: paymentResult.message,
      // Never log card details or personal information
    });

    // Return response
    return NextResponse.json(paymentResult, {
      status: paymentResult.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      }
    });

  } catch (error) {
    // Log error without exposing sensitive information
    console.error('Payment processing error:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      // Never log request data or sensitive information
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Payment processing failed'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
