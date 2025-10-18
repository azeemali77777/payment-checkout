// Analytics and Event Logging System

export interface AnalyticsEvent {
  event: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  properties?: Record<string, any>;
  metadata?: {
    userAgent: string;
    url: string;
    referrer: string;
  };
}

export interface CheckoutEvent extends AnalyticsEvent {
  event: 'checkout_started' | 'checkout_step_completed' | 'payment_attempted' | 'payment_succeeded' | 'payment_failed' | 'checkout_abandoned';
  properties: {
    step?: number;
    cartValue?: number;
    itemCount?: number;
    paymentMethod?: string;
    errorCode?: string;
    errorMessage?: string;
    transactionId?: string;
    retryAttempt?: number;
  };
}

class AnalyticsService {
  private sessionId: string;
  private events: AnalyticsEvent[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    // Initialize session tracking
    if (typeof window !== 'undefined') {
      this.trackPageView();
      this.setupBeforeUnloadTracking();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getMetadata() {
    if (typeof window === 'undefined') return undefined;
    
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer
    };
  }

  // Track generic events
  track(event: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties,
      metadata: this.getMetadata()
    };

    this.events.push(analyticsEvent);
    this.sendEvent(analyticsEvent);
  }

  // Track checkout-specific events
  trackCheckout(event: CheckoutEvent): void {
    if (!this.isEnabled) return;

    const checkoutEvent: CheckoutEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: this.getMetadata()
    };

    this.events.push(checkoutEvent);
    this.sendEvent(checkoutEvent);
  }

  // Track checkout started
  trackCheckoutStarted(cartValue: number, itemCount: number): void {
    this.trackCheckout({
      event: 'checkout_started',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: {
        cartValue,
        itemCount
      }
    });
  }

  // Track step completion
  trackStepCompleted(step: number, cartValue: number): void {
    this.trackCheckout({
      event: 'checkout_step_completed',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: {
        step,
        cartValue
      }
    });
  }

  // Track payment attempt
  trackPaymentAttempted(cartValue: number, paymentMethod: string, retryAttempt: number = 0): void {
    this.trackCheckout({
      event: 'payment_attempted',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: {
        cartValue,
        paymentMethod,
        retryAttempt
      }
    });
  }

  // Track payment success
  trackPaymentSucceeded(cartValue: number, paymentMethod: string, transactionId: string): void {
    this.trackCheckout({
      event: 'payment_succeeded',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: {
        cartValue,
        paymentMethod,
        transactionId
      }
    });
  }

  // Track payment failure
  trackPaymentFailed(cartValue: number, paymentMethod: string, errorCode: string, errorMessage: string, retryAttempt: number = 0): void {
    this.trackCheckout({
      event: 'payment_failed',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: {
        cartValue,
        paymentMethod,
        errorCode,
        errorMessage,
        retryAttempt
      }
    });
  }

  // Track checkout abandonment
  trackCheckoutAbandoned(step: number, cartValue: number): void {
    this.trackCheckout({
      event: 'checkout_abandoned',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: {
        step,
        cartValue
      }
    });
  }

  // Track page views
  private trackPageView(): void {
    this.track('page_view', {
      path: window.location.pathname,
      search: window.location.search
    });
  }

  // Setup abandonment tracking
  private setupBeforeUnloadTracking(): void {
    let checkoutStarted = false;
    let currentStep = 1;
    let cartValue = 0;

    // Listen for checkout events to track state
    window.addEventListener('checkout-started', ((e: CustomEvent) => {
      checkoutStarted = true;
      cartValue = e.detail.cartValue;
    }) as EventListener);

    window.addEventListener('checkout-step-changed', ((e: CustomEvent) => {
      currentStep = e.detail.step;
    }) as EventListener);

    window.addEventListener('payment-succeeded', (() => {
      checkoutStarted = false; // Don't track abandonment after success
    }) as EventListener);

    // Track abandonment on page unload
    window.addEventListener('beforeunload', () => {
      if (checkoutStarted && currentStep < 3) { // Assuming 3 steps total
        this.trackCheckoutAbandoned(currentStep, cartValue);
      }
    });
  }

  // Send event to analytics service (mock implementation)
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // In a real implementation, this would send to your analytics service
      // For now, we'll log to console and store locally
      console.log('Analytics Event:', event);

      // Store in localStorage for debugging (in real app, send to server)
      if (typeof window !== 'undefined') {
        const storedEvents = JSON.parse(localStorage.getItem('checkout_analytics') || '[]');
        storedEvents.push(event);
        
        // Keep only last 100 events to prevent storage bloat
        if (storedEvents.length > 100) {
          storedEvents.splice(0, storedEvents.length - 100);
        }
        
        localStorage.setItem('checkout_analytics', JSON.stringify(storedEvents));
      }

      // Mock API call (in production, replace with actual analytics service)
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }).catch(error => {
          console.warn('Failed to send analytics event:', error);
        });
      }
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  // Get session events (for debugging)
  getSessionEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  // Clear events
  clearEvents(): void {
    this.events = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('checkout_analytics');
    }
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Get analytics summary
  getAnalyticsSummary(): {
    sessionId: string;
    eventCount: number;
    checkoutEvents: number;
    paymentAttempts: number;
    successfulPayments: number;
    failedPayments: number;
  } {
    const checkoutEvents = this.events.filter(e => e.event.startsWith('checkout_') || e.event.startsWith('payment_'));
    const paymentAttempts = this.events.filter(e => e.event === 'payment_attempted');
    const successfulPayments = this.events.filter(e => e.event === 'payment_succeeded');
    const failedPayments = this.events.filter(e => e.event === 'payment_failed');

    return {
      sessionId: this.sessionId,
      eventCount: this.events.length,
      checkoutEvents: checkoutEvents.length,
      paymentAttempts: paymentAttempts.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length
    };
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// Utility functions for common tracking scenarios
export const trackCheckoutFlow = {
  started: (cartValue: number, itemCount: number) => 
    analytics.trackCheckoutStarted(cartValue, itemCount),
  
  stepCompleted: (step: number, cartValue: number) => 
    analytics.trackStepCompleted(step, cartValue),
  
  paymentAttempted: (cartValue: number, paymentMethod: string, retryAttempt?: number) => 
    analytics.trackPaymentAttempted(cartValue, paymentMethod, retryAttempt),
  
  paymentSucceeded: (cartValue: number, paymentMethod: string, transactionId: string) => 
    analytics.trackPaymentSucceeded(cartValue, paymentMethod, transactionId),
  
  paymentFailed: (cartValue: number, paymentMethod: string, errorCode: string, errorMessage: string, retryAttempt?: number) => 
    analytics.trackPaymentFailed(cartValue, paymentMethod, errorCode, errorMessage, retryAttempt),
  
  abandoned: (step: number, cartValue: number) => 
    analytics.trackCheckoutAbandoned(step, cartValue)
};

// Custom event dispatchers for browser events
export const dispatchCheckoutEvent = (eventName: string, detail: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
};




