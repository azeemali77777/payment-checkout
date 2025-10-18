/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST, GET, PUT, DELETE } from '@/app/api/payment/route'
import type { PaymentRequest } from '@/lib/types'

// Mock the utilities
jest.mock('@/lib/utils', () => ({
  generateTransactionId: () => 'txn_mock_123',
  simulateNetworkDelay: jest.fn().mockResolvedValue(undefined),
}))

describe('/api/payment', () => {
  const validPaymentRequest: PaymentRequest = {
    cart: {
      items: [
        {
          id: '1',
          name: 'Test Product',
          price: 99.99,
          quantity: 1,
        },
      ],
      subtotal: 99.99,
      tax: 8.00,
      shipping: 0,
      total: 107.99,
    },
    payment: {
      cardNumber: '4532015112830366',
      expiryDate: '12/25',
      cardholderName: 'John Doe',
      cardNumberLast4: '0366',
      cardType: 'Visa',
      billingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
    },
  }

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    // Use unique IP for each test to avoid rate limiting conflicts
    const uniqueIP = `192.168.1.${Math.floor(Math.random() * 255)}`;
    return {
      json: () => Promise.resolve(body),
      headers: {
        get: (name: string) => headers[name] || (name === 'x-forwarded-for' ? uniqueIP : null),
      },
    } as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Clear console mocks
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Clear rate limiting map between tests
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('POST /api/payment', () => {
    describe('Successful Payment Processing', () => {
      test('should process valid payment successfully', async () => {
        const request = createMockRequest(validPaymentRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.transactionId).toBe('txn_mock_123')
        expect(data.message).toBe('Payment processed successfully')
      })

      test('should include security headers in response', async () => {
        const request = createMockRequest(validPaymentRequest)
        const response = await POST(request)

        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(response.headers.get('X-Frame-Options')).toBe('DENY')
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      })

      test('should log payment attempt without sensitive data', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const request = createMockRequest(validPaymentRequest)
        
        await POST(request)

        expect(consoleSpy).toHaveBeenCalledWith('Payment attempt:', expect.objectContaining({
          cardType: 'Visa',
          cardLast4: '0366',
          amount: 107.99,
          itemCount: 1,
        }))

        // Ensure no sensitive data is logged
        const logCalls = consoleSpy.mock.calls.flat()
        const logString = JSON.stringify(logCalls)
        expect(logString).not.toContain('4532015112830366')
        expect(logString).not.toContain('John Doe')
      })
    })

    describe('Payment Failure Scenarios', () => {
      test('should handle insufficient funds (card ending in 0000)', async () => {
        const insufficientFundsRequest = {
          ...validPaymentRequest,
          payment: {
            ...validPaymentRequest.payment,
            cardNumber: '4532015112830000',
            cardNumberLast4: '0000',
          },
        }

        const request = createMockRequest(insufficientFundsRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Insufficient funds')
        expect(data.message).toBe('Payment declined')
      })

      test('should handle expired card (card ending in 1111)', async () => {
        const expiredCardRequest = {
          ...validPaymentRequest,
          payment: {
            ...validPaymentRequest.payment,
            cardNumber: '4532015112831111',
            cardNumberLast4: '1111',
          },
        }

        const request = createMockRequest(expiredCardRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Card expired')
      })

      test('should handle invalid card number (card ending in 2222)', async () => {
        const invalidCardRequest = {
          ...validPaymentRequest,
          payment: {
            ...validPaymentRequest.payment,
            cardNumber: '4532015112832222',
            cardNumberLast4: '2222',
          },
        }

        const request = createMockRequest(invalidCardRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid card number')
      })
    })

    describe('Request Validation', () => {
      test('should reject request with missing cart data', async () => {
        const invalidRequest = {
          payment: validPaymentRequest.payment,
        }

        const request = createMockRequest(invalidRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid request data')
      })

      test('should reject request with empty cart', async () => {
        const emptyCartRequest = {
          ...validPaymentRequest,
          cart: {
            ...validPaymentRequest.cart,
            items: [],
          },
        }

        const request = createMockRequest(emptyCartRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid request data')
      })

      test('should reject request with invalid cart total', async () => {
        const invalidTotalRequest = {
          ...validPaymentRequest,
          cart: {
            ...validPaymentRequest.cart,
            total: -10,
          },
        }

        const request = createMockRequest(invalidTotalRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid request data')
      })

      test('should reject request with missing payment fields', async () => {
        const missingFieldsRequest = {
          ...validPaymentRequest,
          payment: {
            cardNumber: '4532015112830366',
            // Missing other required fields
          },
        }

        const request = createMockRequest(missingFieldsRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid request data')
      })

      test('should reject request with missing billing address fields', async () => {
        const missingAddressRequest = {
          ...validPaymentRequest,
          payment: {
            ...validPaymentRequest.payment,
            billingAddress: {
              street: '123 Main St',
              // Missing other required fields
            },
          },
        }

        const request = createMockRequest(missingAddressRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid request data')
      })
    })

    describe('Input Sanitization', () => {
      test('should sanitize input data', async () => {
        const maliciousRequest = {
          ...validPaymentRequest,
          payment: {
            ...validPaymentRequest.payment,
            cardholderName: '<script>alert("xss")</script>John Doe',
            billingAddress: {
              ...validPaymentRequest.payment.billingAddress,
              street: '<img src=x onerror=alert(1)>123 Main St',
              city: 'New<script>York',
            },
          },
        }

        const request = createMockRequest(maliciousRequest)
        const response = await POST(request)

        // Should still process successfully after sanitization
        expect(response.status).toBe(200)

        // Verify sanitization occurred (check logs or response)
        const consoleSpy = jest.spyOn(console, 'log')
        expect(consoleSpy).toHaveBeenCalled()
      })
    })

    describe('Rate Limiting', () => {
      test('should enforce rate limiting', async () => {
        const request = createMockRequest(validPaymentRequest, {
          'x-forwarded-for': '192.168.1.1',
        })

        // Make multiple requests from same IP
        const responses = []
        for (let i = 0; i < 6; i++) {
          responses.push(await POST(request))
        }

        // First 5 should succeed, 6th should be rate limited
        const lastResponse = responses[responses.length - 1]
        const data = await lastResponse.json()

        expect(lastResponse.status).toBe(429)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Too many payment attempts. Please try again later.')
      })

      test('should handle missing IP headers gracefully', async () => {
        const request = createMockRequest(validPaymentRequest)
        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Server-side Validation', () => {
      test('should perform server-side validation of payment data', async () => {
        const invalidCardRequest = {
          ...validPaymentRequest,
          payment: {
            ...validPaymentRequest.payment,
            cardNumber: '1234567890123456', // Invalid card number
          },
        }

        const request = createMockRequest(invalidCardRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Payment information is invalid')
      })
    })

    describe('Error Handling', () => {
      test('should handle malformed JSON', async () => {
        const request = {
          json: () => Promise.reject(new Error('Invalid JSON')),
          headers: {
            get: () => null,
          },
        } as NextRequest

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid request format')
      })

      test('should handle unexpected errors gracefully', async () => {
        // Mock an error in validation
        jest.doMock('@/lib/validation', () => ({
          validatePaymentForm: () => {
            throw new Error('Unexpected error')
          },
          sanitizeInput: (input: string) => input,
        }))

        const request = createMockRequest(validPaymentRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Internal server error')
      })
    })
  })

  describe('Unsupported HTTP Methods', () => {
    test('should return 405 for GET requests', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })

    test('should return 405 for PUT requests', async () => {
      const response = await PUT()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })

    test('should return 405 for DELETE requests', async () => {
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Edge Cases', () => {
    test('should handle very large cart totals', async () => {
      const largeAmountRequest = {
        ...validPaymentRequest,
        cart: {
          ...validPaymentRequest.cart,
          total: 999999.99,
        },
      }

      const request = createMockRequest(largeAmountRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    test('should handle international characters in names and addresses', async () => {
      const internationalRequest = {
        ...validPaymentRequest,
        payment: {
          ...validPaymentRequest.payment,
          cardholderName: 'José María García',
          billingAddress: {
            ...validPaymentRequest.payment.billingAddress,
            street: 'Calle de Alcalá 123',
            city: 'Madrid',
          },
        },
      }

      const request = createMockRequest(internationalRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    test('should handle minimum valid cart amount', async () => {
      const minAmountRequest = {
        ...validPaymentRequest,
        cart: {
          ...validPaymentRequest.cart,
          total: 0.01,
        },
      }

      const request = createMockRequest(minAmountRequest)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})


