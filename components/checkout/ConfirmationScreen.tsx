'use client';

import { memo, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import type { PaymentResponse, Cart } from '@/lib/types';
import { analytics } from '@/lib/analytics';

interface ConfirmationScreenProps {
  paymentResponse: PaymentResponse;
  cart: Cart;
  onNewOrder: () => void;
  onPrintReceipt?: () => void;
}

const ConfirmationScreen = memo(({ 
  paymentResponse, 
  cart, 
  onNewOrder, 
  onPrintReceipt 
}: ConfirmationScreenProps) => {
  
  useEffect(() => {
    // Track successful completion
    analytics.track('checkout_completed', {
      transactionId: paymentResponse.transactionId,
      cartValue: cart.total,
      itemCount: cart.items.length
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paymentResponse.transactionId, cart.total, cart.items.length]);

  const handlePrint = () => {
    if (onPrintReceipt) {
      onPrintReceipt();
    } else {
      window.print();
    }
    
    analytics.track('receipt_printed', {
      transactionId: paymentResponse.transactionId
    });
  };

  const handleNewOrder = () => {
    analytics.track('new_order_started', {
      previousTransactionId: paymentResponse.transactionId
    });
    onNewOrder();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-lg text-gray-600">
          Thank you for your order. Your payment has been processed successfully.
        </p>
      </div>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction Details</span>
            <span className="text-sm font-normal text-green-600 bg-green-100 px-3 py-1 rounded-full">
              Completed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Transaction ID</h4>
              <p className="text-lg font-mono text-gray-900 break-all">
                {paymentResponse.transactionId}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Date & Time</h4>
              <p className="text-lg text-gray-900">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h4>
              <p className="text-lg text-gray-900">Credit Card</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Total Amount</h4>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(cart.total)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Items */}
          <div className="space-y-3 mb-6">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  {item.image && (
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        priority={false}
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(item.price)} each
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">
                {cart.shipping === 0 ? 'Free' : formatCurrency(cart.shipping)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatCurrency(cart.tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
              <span className="text-gray-900">Total</span>
              <span className="text-green-600">{formatCurrency(cart.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Confirmation Email</h4>
            <p className="text-sm text-gray-600">
              You&apos;ll receive a confirmation email with your receipt and order details within the next few minutes.
            </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Processing</h4>
                <p className="text-sm text-gray-600">
                  Your order is being processed and will be prepared for shipping within 1-2 business days.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Shipping Updates</h4>
            <p className="text-sm text-gray-600">
              You&apos;ll receive tracking information once your order ships, typically within 3-5 business days.
            </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1"
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
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Receipt
        </Button>
        
        <Button
          onClick={handleNewOrder}
          variant="primary"
          className="flex-1"
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
              d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8"
            />
          </svg>
          Start New Order
        </Button>
      </div>

      {/* Support Information */}
      <div className="text-center pt-8 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-600 mb-4">
          Our customer support team is here to help with any questions about your order.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:support@example.com"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            support@example.com
          </a>
          <a
            href="tel:+1-800-123-4567"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            1-800-123-4567
          </a>
        </div>
      </div>
    </div>
  );
});

ConfirmationScreen.displayName = 'ConfirmationScreen';

export { ConfirmationScreen };
