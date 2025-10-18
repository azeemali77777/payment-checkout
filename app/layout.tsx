import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Secure Checkout - Payment Processing",
  description: "Secure and fast checkout experience with encrypted payment processing",
  keywords: "checkout, payment, secure, e-commerce, shopping cart",
  authors: [{ name: "Payment Checkout Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "noindex, nofollow", // Prevent indexing of checkout pages
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Performance monitoring - only in production */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Inline performance monitoring for critical metrics
                (function() {
                  if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                      for (const entry of list.getEntries()) {
                        if (entry.entryType === 'largest-contentful-paint') {
                          console.log('LCP:', entry.startTime);
                        }
                      }
                    });
                    observer.observe({entryTypes: ['largest-contentful-paint']});
                  }
                })();
              `
            }}
          />
        )}
      </body>
    </html>
  );
}
