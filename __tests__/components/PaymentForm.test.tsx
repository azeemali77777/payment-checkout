/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentForm } from '@/components/checkout/PaymentForm'
import type { Cart, PaymentResponse } from '@/lib/types'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock debounce to make tests synchronous
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  debounce: (fn: any) => fn,
}))

describe('PaymentForm Component', () => {
  const mockCart: Cart = {
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
  }

  const mockOnPaymentSuccess = jest.fn()
  const mockOnPaymentError = jest.fn()

  const defaultProps = {
    cart: mockCart,
    onPaymentSuccess: mockOnPaymentSuccess,
    onPaymentError: mockOnPaymentError,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Rendering', () => {
    test('should render all form fields', () => {
      render(<PaymentForm {...defaultProps} />)

      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/cardholder name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
    })

    test('should render submit button with cart total', () => {
      render(<PaymentForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /pay \$107\.99/i })).toBeInTheDocument()
    })

    test('should render security notice', () => {
      render(<PaymentForm {...defaultProps} />)
      expect(screen.getByText(/your payment information is encrypted and secure/i)).toBeInTheDocument()
    })

    test('should have submit button disabled initially', () => {
      render(<PaymentForm {...defaultProps} />)
      const submitButton = screen.getByRole('button', { name: /pay/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Input Formatting', () => {
    test('should format card number with spaces', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      await user.type(cardNumberInput, '4532015112830366')

      expect(cardNumberInput).toHaveValue('4532 0151 1283 0366')
    })

    test('should format expiry date with slash', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const expiryInput = screen.getByLabelText(/expiry date/i)
      await user.type(expiryInput, '1225')

      expect(expiryInput).toHaveValue('12/25')
    })

    test('should limit CVV to 3 digits for non-Amex cards', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cvvInput = screen.getByLabelText(/cvv/i)
      await user.type(cvvInput, '12345')

      expect(cvvInput).toHaveValue('123')
    })

    test('should limit CVV to 4 digits for American Express', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      const cvvInput = screen.getByLabelText(/cvv/i)

      // Enter Amex card number first
      await user.type(cardNumberInput, '378282246310005')
      await user.type(cvvInput, '12345')

      expect(cvvInput).toHaveValue('1234')
    })

    test('should only allow letters in cardholder name', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/cardholder name/i)
      await user.type(nameInput, 'John123 Doe!')

      expect(nameInput).toHaveValue('JohnDoe')
    })
  })

  describe('Card Type Detection', () => {
    test('should detect and display Visa card type', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      await user.type(cardNumberInput, '4532')

      expect(screen.getByText('(Visa)')).toBeInTheDocument()
    })

    test('should detect and display Mastercard type', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      await user.type(cardNumberInput, '5555')

      expect(screen.getByText('(Mastercard)')).toBeInTheDocument()
    })

    test('should detect and display American Express type', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      await user.type(cardNumberInput, '3782')

      expect(screen.getByText('(American Express)')).toBeInTheDocument()
    })

    test('should update CVV placeholder for American Express', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      const cvvInput = screen.getByLabelText(/cvv/i)

      await user.type(cardNumberInput, '3782')

      expect(cvvInput).toHaveAttribute('placeholder', '1234')
    })
  })

  describe('Form Validation', () => {
  test('should show validation errors for invalid data', async () => {
    const user = userEvent.setup()
    render(<PaymentForm {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /pay/i })
    
    // The button should be disabled initially for empty form
    expect(submitButton).toBeDisabled()
    
    // Fill in some valid data but leave card number invalid
    await user.type(screen.getByLabelText(/card number/i), '123456789012345') // Invalid card number
    await user.type(screen.getByLabelText(/expiry date/i), '1225')
    await user.type(screen.getByLabelText(/cvv/i), '123')
    await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe')
    await user.type(screen.getByLabelText(/street address/i), '123 Main St')
    await user.type(screen.getByLabelText(/city/i), 'New York')
    await user.type(screen.getByLabelText(/state/i), 'NY')
    await user.type(screen.getByLabelText(/zip code/i), '10001')
    
    // The button should still be disabled because card number is invalid
    expect(submitButton).toBeDisabled()
    
    // Now make the card number valid but submit immediately to test validation
    await user.clear(screen.getByLabelText(/card number/i))
    await user.type(screen.getByLabelText(/card number/i), '4532015112830366')
    
    // Wait for button to be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    // Clear a required field to make form invalid again
    await user.clear(screen.getByLabelText(/cardholder name/i))
    
    // Try to submit form with invalid data
    await user.click(submitButton)

    // Check that the error callback is called
    await waitFor(() => {
      expect(mockOnPaymentError).toHaveBeenCalledWith('Please correct the errors in the form')
    })
  })

    test('should validate card number format', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      await user.type(cardNumberInput, '1234567890123456') // Invalid card number

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid card number/i)).toBeInTheDocument()
      })
    })

    test('should validate expiry date format and future date', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const expiryInput = screen.getByLabelText(/expiry date/i)
      await user.type(expiryInput, '1220') // Past date

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid expiry date/i)).toBeInTheDocument()
      })
    })

    test('should validate ZIP code format', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const zipInput = screen.getByLabelText(/zip code/i)
      await user.type(zipInput, '123') // Invalid ZIP

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid zip code/i)).toBeInTheDocument()
      })
    })

    test('should enable submit button when form is valid', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      // Fill out valid form
      await user.type(screen.getByLabelText(/card number/i), '4532015112830366')
      await user.type(screen.getByLabelText(/expiry date/i), '1225')
      await user.type(screen.getByLabelText(/cvv/i), '123')
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.type(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '10001')

      const submitButton = screen.getByRole('button', { name: /pay/i })
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Form Submission', () => {
    const fillValidForm = async (user: any) => {
      await user.type(screen.getByLabelText(/card number/i), '4532015112830366')
      await user.type(screen.getByLabelText(/expiry date/i), '1225')
      await user.type(screen.getByLabelText(/cvv/i), '123')
      await user.type(screen.getByLabelText(/cardholder name/i), 'John Doe')
      await user.type(screen.getByLabelText(/street address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      await user.type(screen.getByLabelText(/state/i), 'NY')
      await user.type(screen.getByLabelText(/zip code/i), '10001')
      await user.type(screen.getByLabelText(/country/i), 'US')
    }

    test('should submit form with valid data', async () => {
      const user = userEvent.setup()
      const mockSuccessResponse: PaymentResponse = {
        success: true,
        transactionId: 'txn_123',
        message: 'Payment successful',
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockSuccessResponse),
      })

      render(<PaymentForm {...defaultProps} />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"cardNumber":"4532 0151 1283 0366"'),
        })
      })

      expect(mockOnPaymentSuccess).toHaveBeenCalledWith(mockSuccessResponse)
    })

    test('should handle payment failure', async () => {
      const user = userEvent.setup()
      const mockErrorResponse: PaymentResponse = {
        success: false,
        message: 'Payment failed',
        error: 'Insufficient funds',
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockErrorResponse),
      })

      render(<PaymentForm {...defaultProps} />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnPaymentError).toHaveBeenCalledWith('Insufficient funds')
      })
    })

    test('should handle network error', async () => {
      const user = userEvent.setup()

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<PaymentForm {...defaultProps} />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnPaymentError).toHaveBeenCalledWith('Network error. Please try again.')
      })
    })

    test('should show loading state during submission', async () => {
      const user = userEvent.setup()

      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          json: () => Promise.resolve({ success: true, message: 'Success' })
        }), 100))
      )

      render(<PaymentForm {...defaultProps} />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      // Check loading state
      expect(screen.getByText(/processing payment/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/processing payment/i)).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    test('should not include CVV in payment request', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, message: 'Success' }),
      })

      render(<PaymentForm {...defaultProps} />)

      await fillValidForm(user)

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(requestBody.payment.cvv).toBeUndefined()
        expect(requestBody.payment.cardNumberLast4).toBe('0366')
        expect(requestBody.payment.cardType).toBe('Visa')
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels and descriptions', () => {
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      expect(cardNumberInput).toHaveAttribute('aria-describedby')

      const cvvInput = screen.getByLabelText(/cvv/i)
      expect(cvvInput).toHaveAttribute('aria-describedby')
    })

    test('should mark invalid fields with aria-invalid', async () => {
      const user = userEvent.setup()
      render(<PaymentForm {...defaultProps} />)

      const cardNumberInput = screen.getByLabelText(/card number/i)
      await user.type(cardNumberInput, '123')

      const submitButton = screen.getByRole('button', { name: /pay/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(cardNumberInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    test('should have proper autocomplete attributes', () => {
      render(<PaymentForm {...defaultProps} />)

      expect(screen.getByLabelText(/card number/i)).toHaveAttribute('autoComplete', 'cc-number')
      expect(screen.getByLabelText(/expiry date/i)).toHaveAttribute('autoComplete', 'cc-exp')
      expect(screen.getByLabelText(/cvv/i)).toHaveAttribute('autoComplete', 'cc-csc')
      expect(screen.getByLabelText(/cardholder name/i)).toHaveAttribute('autoComplete', 'cc-name')
    })
  })
})


