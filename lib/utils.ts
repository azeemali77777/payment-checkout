// Utility functions for the checkout application
import { clsx, type ClassValue } from 'clsx';

// Class name utility using clsx
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Calculate cart totals
export function calculateCartTotals(items: Array<{ price: number; quantity: number }>) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax rate
  const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
  const total = subtotal + tax + shipping;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Debounce function for input validation
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generate unique transaction ID
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `txn_${timestamp}_${randomStr}`;
}

// Simulate network delay for testing
export function simulateNetworkDelay(ms: number = 2000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate mock cart data for testing
export function generateMockCart() {
  return {
    items: [
      {
        id: '1',
        name: 'Wireless Bluetooth Headphones',
        price: 79.99,
        quantity: 1,
        image: '/images/headphones.svg'
      },
      {
        id: '2',
        name: 'USB-C Charging Cable',
        price: 19.99,
        quantity: 2,
        image: '/images/cable.svg'
      },
      {
        id: '3',
        name: 'Laptop Stand',
        price: 49.99,
        quantity: 1,
        image: '/images/laptop-stand.svg'
      }
    ],
    ...calculateCartTotals([
      { price: 79.99, quantity: 1 },
      { price: 19.99, quantity: 2 },
      { price: 49.99, quantity: 1 }
    ])
  };
}
