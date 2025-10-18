/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const metrics: PerformanceMetrics = {};

    // Observe performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              metrics.fcp = entry.startTime;
            }
            break;
          case 'largest-contentful-paint':
            metrics.lcp = entry.startTime;
            break;
          case 'first-input':
            metrics.fid = (entry as any).processingStart - entry.startTime;
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + (entry as any).value;
            }
            break;
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
            break;
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] });
    } catch (error) {
      try {
        observer.observe({ entryTypes: ['paint', 'navigation'] });
      } catch (fallbackError) {
        console.warn('Performance monitoring not supported in this browser');
      }
    }

    // Send metrics after page load
    const sendMetrics = () => {
      setTimeout(() => {
        analytics.track('performance_metrics', {
          ...metrics,
          userAgent: navigator.userAgent,
          connection: (navigator as any).connection?.effectiveType,
          deviceMemory: (navigator as any).deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency,
          timestamp: Date.now()
        });
      }, 2000);
    };

    // Send metrics on page load
    if (document.readyState === 'complete') {
      sendMetrics();
    } else {
      window.addEventListener('load', sendMetrics);
    }

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        analytics.track('page_hidden', {
          timeOnPage: Date.now() - performance.timing.navigationStart,
          scrollDepth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track errors
    const handleError = (event: ErrorEvent) => {
      analytics.track('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.track('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      observer.disconnect();
      window.removeEventListener('load', sendMetrics);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return null;
}




