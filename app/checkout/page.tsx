'use client';

import { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import Image from 'next/image';
import { ProgressIndicator, type Step } from '@/components/ui/ProgressIndicator';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { CartSummary } from '@/components/checkout/CartSummary';
import { PaymentRetry } from '@/components/checkout/PaymentRetry';
import { ConfirmationScreen } from '@/components/checkout/ConfirmationScreen';
import type { PaymentResponse, Cart } from '@/lib/types';
import { generateMockCart } from '@/lib/utils';
import { trackCheckoutFlow, dispatchCheckoutEvent } from '@/lib/analytics';

// Lazy load PaymentForm for better performance
const PaymentForm = lazy(() => 
  import('@/components/checkout/PaymentForm').then(module => ({ 
    default: module.PaymentForm 
  }))
);

// Checkout steps configuration
const CHECKOUT_STEPS: Step[] = [
  {
    id: 'review',
    title: 'Review Order',
    description: 'Verify your items'
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Enter payment details'
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    description: 'Order complete'
  }
];

type CheckoutStep = 'review' | 'payment' | 'confirmation';
type PaymentState = 'idle' | 'processing' | 'success' | 'error' | 'retry';

export default function CheckoutPage() {
  const [cart] = useState<Cart>(() => generateMockCart());
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentResponse, setPaymentResponse] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize analytics
  useEffect(() => {
    trackCheckoutFlow.started(cart.total, cart.items.length);
    dispatchCheckoutEvent('checkout-started', { cartValue: cart.total });
    
    // Track step changes
    const stepIndex = CHECKOUT_STEPS.findIndex(step => step.id === currentStep) + 1;
    dispatchCheckoutEvent('checkout-step-changed', { step: stepIndex });
  }, [cart.total, cart.items.length, currentStep]);

  // Get current step index for progress indicator
  const getCurrentStepIndex = useCallback(() => {
    return CHECKOUT_STEPS.findIndex(step => step.id === currentStep) + 1;
  }, [currentStep]);

  // Handle step navigation
  const handleStepChange = useCallback((step: CheckoutStep) => {
    const stepIndex = CHECKOUT_STEPS.findIndex(s => s.id === step) + 1;
    setCurrentStep(step);
    trackCheckoutFlow.stepCompleted(stepIndex, cart.total);
    
    // Clear errors when changing steps
    setError(null);
    setPaymentState('idle');
  }, [cart.total]);

  // Handle payment success
  const handlePaymentSuccess = useCallback((response: PaymentResponse) => {
    setPaymentResponse(response);
    setPaymentState('success');
    setCurrentStep('confirmation');
    setError(null);
    setRetryCount(0);
    
    trackCheckoutFlow.paymentSucceeded(cart.total, 'credit_card', response.transactionId || '');
    dispatchCheckoutEvent('payment-succeeded', { 
      transactionId: response.transactionId,
      cartValue: cart.total 
    });
  }, [cart.total]);

  // Handle payment error
  const handlePaymentError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setPaymentState('error');
    setPaymentResponse(null);
    
    trackCheckoutFlow.paymentFailed(cart.total, 'credit_card', 'payment_failed', errorMessage, retryCount);
  }, [cart.total, retryCount]);

  // Handle payment retry
  const handlePaymentRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    setPaymentState('processing');
    setError(null);
    
    trackCheckoutFlow.paymentAttempted(cart.total, 'credit_card', retryCount + 1);
    
    // The actual retry logic is handled by the PaymentForm component
    // This just updates the local state
  }, [cart.total, retryCount]);

  // Handle retry cancel (go back to payment form)
  const handleRetryCancel = useCallback(() => {
    setPaymentState('idle');
    setError(null);
    setRetryCount(0);
  }, []);

  // Handle new order
  const handleNewOrder = useCallback(() => {
    // Reset all state
    setCurrentStep('review');
    setPaymentState('idle');
    setPaymentResponse(null);
    setError(null);
    setRetryCount(0);
    
    // In a real app, you might redirect or reload cart data
    window.location.reload();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation when not in form inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (currentStep === 'payment' && paymentState === 'idle') {
            event.preventDefault();
            handleStepChange('review');
          }
          break;
        case 'ArrowRight':
          if (currentStep === 'review') {
            event.preventDefault();
            handleStepChange('payment');
          }
          break;
        case 'Escape':
          if (paymentState === 'error') {
            event.preventDefault();
            handleRetryCancel();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, paymentState, handleStepChange, handleRetryCancel]);

  // Show confirmation screen
  if (currentStep === 'confirmation' && paymentResponse) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ConfirmationScreen
            paymentResponse={paymentResponse}
            cart={cart}
            onNewOrder={handleNewOrder}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg
                className="w-4 h-4 text-green-600"
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
              <span>SSL Secured</span>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <ProgressIndicator
            steps={CHECKOUT_STEPS}
            currentStep={getCurrentStepIndex()}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && paymentState !== 'retry' && (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertDescription>
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Payment Retry Screen */}
        {paymentState === 'error' && error && (
          <div className="mb-8">
            <PaymentRetry
              error={error}
              onRetry={handlePaymentRetry}
              onCancel={handleRetryCancel}
              currentRetry={retryCount}
              maxRetries={3}
            />
          </div>
        )}

        {/* Main Content */}
        {paymentState !== 'error' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:order-1">
              {/* Review Step */}
              {currentStep === 'review' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Review Your Order
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Please review your order details below. You can modify quantities or remove items before proceeding to payment.
                  </p>
                  
                  {/* Order Items Review */}
                  <div className="space-y-4 mb-6">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {item.image && (
                            <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                priority={false}
                              />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                            <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleStepChange('payment')}
                      size="lg"
                    >
                      Continue to Payment
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Step */}
              {currentStep === 'payment' && (
                <div>
                  {/* Back Button */}
                  <div className="mb-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleStepChange('review')}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to Review
                    </Button>
                  </div>

                  <Suspense 
                    fallback={
                      <div className="bg-white rounded-lg border border-gray-200 p-8">
                        <div className="flex items-center justify-center">
                          <LoadingSpinner size="lg" />
                          <span className="ml-2 text-gray-600">Loading payment form...</span>
                        </div>
                      </div>
                    }
                  >
                    <PaymentForm
                      cart={cart}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            {/* Right Column - Cart Summary */}
            <div className="lg:order-2">
              <CartSummary cart={cart} />
            </div>
          </div>
        )}

        {/* Test Information */}
        {currentStep === 'payment' && paymentState !== 'error' && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Test Card Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Successful Payment:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Card: 4532 1234 5678 9012</li>
                  <li>• Expiry: Any future date</li>
                  <li>• CVV: Any 3 digits</li>
                  <li>• Name: Any name</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Test Failures:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Card ending in 0000: Insufficient funds</li>
                  <li>• Card ending in 1111: Card expired</li>
                  <li>• Card ending in 2222: Invalid card</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Navigation Help */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            💡 <strong>Tip:</strong> Use ← → arrow keys to navigate between steps, ESC to dismiss errors
          </p>
        </div>

        {/* Security & Trust Indicators */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
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
            </div>
            <h4 className="font-medium text-gray-900">Secure Payments</h4>
            <p className="text-sm text-gray-600">256-bit SSL encryption</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">Money Back Guarantee</h4>
            <p className="text-sm text-gray-600">30-day return policy</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z"
                />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900">24/7 Support</h4>
            <p className="text-sm text-gray-600">Always here to help</p>
          </div>
        </div>
      </main>
    </div>
  );
}