import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Checkout - Secure Payment Processing',
  description: 'Complete your purchase with our secure, fast checkout process. SSL encrypted payment processing with multiple payment options.',
  keywords: 'checkout, payment, secure, ssl, credit card, online shopping',
  robots: 'noindex, nofollow', // Prevent indexing of checkout pages
  openGraph: {
    title: 'Secure Checkout',
    description: 'Complete your purchase securely',
    type: 'website',
  },
};

// Force dynamic rendering for checkout pages (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CheckoutLayoutProps {
  children: React.ReactNode;
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  return (
    <div className="checkout-layout">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      {/* Main content with proper landmark */}
      <main id="main-content" role="main">
        <Suspense
          fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600">Loading checkout...</p>
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
