'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import type { Cart } from '@/lib/types';

interface CartSummaryProps {
  cart: Cart;
}

const CartItem = memo(({ item }: { item: Cart['items'][0] }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
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
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </h4>
        <p className="text-sm text-gray-500">
          Qty: {item.quantity}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-medium text-gray-900">
        {formatCurrency(item.price * item.quantity)}
      </p>
      <p className="text-xs text-gray-500">
        {formatCurrency(item.price)} each
      </p>
    </div>
  </div>
));

CartItem.displayName = 'CartItem';

const CartSummary = memo(({ cart }: CartSummaryProps) => {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Order Summary
          <span className="text-sm font-normal text-gray-500">
            {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-0">
          {cart.items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        {/* Order Totals */}
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
          
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(cart.total)}</span>
          </div>
        </div>

        {/* Free Shipping Notice */}
        {cart.shipping > 0 && cart.subtotal < 50 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              Add {formatCurrency(50 - cart.subtotal)} more for free shipping!
            </p>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-gray-50 rounded-md p-3">
          <div className="flex items-center space-x-2">
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
            <p className="text-xs text-gray-600">
              Your payment information is secure and encrypted
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CartSummary.displayName = 'CartSummary';

export { CartSummary };
