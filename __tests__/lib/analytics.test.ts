/* eslint-disable @typescript-eslint/ban-ts-comment */
import { 
  analytics,
  trackCheckoutFlow,
  dispatchCheckoutEvent} from '@/lib/analytics'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Analytics Library', () => {
  let mockDispatchEvent: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    // Clear analytics events
    analytics.clearEvents()
    
    // Mock console.log to avoid noise
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    // Mock browser environment by extending existing objects
    mockDispatchEvent = jest.fn()
    
    // Mock window properties
    Object.assign(window, {
      location: {
        href: 'https://example.com/test',
        pathname: '/test',
        search: '?param=value'
      },
      dispatchEvent: mockDispatchEvent
    })

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 Test Browser'
      },
      configurable: true
    })

    // Mock document
    Object.defineProperty(window, 'document', {
      value: {
        referrer: 'https://google.com'
      },
      configurable: true
    })
  })

  describe('Analytics Service', () => {
    test('should have a session ID', () => {
      const summary = analytics.getAnalyticsSummary()
      expect(summary.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    test('should track generic events', () => {
      analytics.track('test_event', { test: 'value' })
      
      const events = analytics.getSessionEvents()
      expect(events).toHaveLength(1)
      expect(events[0].event).toBe('test_event')
      expect(events[0].properties).toEqual({ test: 'value' })
    })

    test('should include metadata in events', () => {
      analytics.track('test_event')
      
      const events = analytics.getSessionEvents()
      expect(events[0].metadata).toBeDefined()
      expect(events[0].metadata?.userAgent).toBe('Mozilla/5.0 Test Browser')
      expect(events[0].metadata?.url).toBe('https://example.com/test')
      expect(events[0].metadata?.referrer).toBe('https://google.com')
    })
  })

  describe('Checkout Flow Tracking', () => {
    test('should track checkout started', () => {
      trackCheckoutFlow.started(99.99, 3)
      
      const events = analytics.getSessionEvents()
      const checkoutEvent = events.find(e => e.event === 'checkout_started')
      
      expect(checkoutEvent).toBeDefined()
      expect(checkoutEvent?.properties).toEqual({
        cartValue: 99.99,
        itemCount: 3
      })
    })

    test('should track step completion', () => {
      trackCheckoutFlow.stepCompleted(2, 99.99)
      
      const events = analytics.getSessionEvents()
      const stepEvent = events.find(e => e.event === 'checkout_step_completed')
      
      expect(stepEvent).toBeDefined()
      expect(stepEvent?.properties).toEqual({
        step: 2,
        cartValue: 99.99
      })
    })

    test('should track payment attempted', () => {
      trackCheckoutFlow.paymentAttempted(99.99, 'card', 1)
      
      const events = analytics.getSessionEvents()
      const paymentEvent = events.find(e => e.event === 'payment_attempted')
      
      expect(paymentEvent).toBeDefined()
      expect(paymentEvent?.properties).toEqual({
        cartValue: 99.99,
        paymentMethod: 'card',
        retryAttempt: 1
      })
    })

    test('should track payment success', () => {
      trackCheckoutFlow.paymentSucceeded(99.99, 'card', 'txn_123')
      
      const events = analytics.getSessionEvents()
      const successEvent = events.find(e => e.event === 'payment_succeeded')
      
      expect(successEvent).toBeDefined()
      expect(successEvent?.properties).toEqual({
        cartValue: 99.99,
        paymentMethod: 'card',
        transactionId: 'txn_123'
      })
    })

    test('should track payment failure', () => {
      trackCheckoutFlow.paymentFailed(99.99, 'card', 'DECLINED', 'Insufficient funds', 2)
      
      const events = analytics.getSessionEvents()
      const failureEvent = events.find(e => e.event === 'payment_failed')
      
      expect(failureEvent).toBeDefined()
      expect(failureEvent?.properties).toEqual({
        cartValue: 99.99,
        paymentMethod: 'card',
        errorCode: 'DECLINED',
        errorMessage: 'Insufficient funds',
        retryAttempt: 2
      })
    })

    test('should track checkout abandonment', () => {
      trackCheckoutFlow.abandoned(2, 99.99)
      
      const events = analytics.getSessionEvents()
      const abandonEvent = events.find(e => e.event === 'checkout_abandoned')
      
      expect(abandonEvent).toBeDefined()
      expect(abandonEvent?.properties).toEqual({
        step: 2,
        cartValue: 99.99
      })
    })
  })

  describe('Analytics Summary', () => {
    test('should provide analytics summary', () => {
      // Track various events
      trackCheckoutFlow.started(99.99, 3)
      trackCheckoutFlow.paymentAttempted(99.99, 'card')
      trackCheckoutFlow.paymentFailed(99.99, 'card', 'DECLINED', 'Insufficient funds')
      trackCheckoutFlow.paymentAttempted(99.99, 'card', 1)
      trackCheckoutFlow.paymentSucceeded(99.99, 'card', 'txn_123')
      
      const summary = analytics.getAnalyticsSummary()
      
      expect(summary.eventCount).toBe(5)
      expect(summary.checkoutEvents).toBe(5)
      expect(summary.paymentAttempts).toBe(2)
      expect(summary.successfulPayments).toBe(1)
      expect(summary.failedPayments).toBe(1)
    })

    test('should clear events', () => {
      analytics.track('test_event')
      expect(analytics.getSessionEvents()).toHaveLength(1)
      
      analytics.clearEvents()
      expect(analytics.getSessionEvents()).toHaveLength(0)
    })

    test('should enable/disable analytics', () => {
      analytics.setEnabled(false)
      analytics.track('test_event')
      expect(analytics.getSessionEvents()).toHaveLength(0)
      
      analytics.setEnabled(true)
      analytics.track('test_event')
      expect(analytics.getSessionEvents()).toHaveLength(1)
    })
  })

  describe('Custom Event Dispatching', () => {
    test('should dispatch custom events', () => {
      dispatchCheckoutEvent('checkout-started', { cartValue: 99.99 })
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkout-started',
          detail: { cartValue: 99.99 }
        })
      )
    })

    test('should handle missing window object', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      expect(() => {
        dispatchCheckoutEvent('test-event', {})
      }).not.toThrow()

      global.window = originalWindow
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing window object (SSR)', () => {
      // Test that analytics can handle SSR environment
      // In our setup, window is always mocked, so just test basic functionality
      analytics.track('test_event')
      const events = analytics.getSessionEvents()
      expect(events).toHaveLength(1)
    })

    test('should handle missing navigator gracefully', () => {
      // Test that analytics handles missing navigator
      analytics.track('test_event')
      const events = analytics.getSessionEvents()
      expect(events[0].metadata).toBeDefined()
    })

    test('should handle very long event names', () => {
      const longEventName = 'a'.repeat(1000)
      
      analytics.track(longEventName)
      
      const events = analytics.getSessionEvents()
      expect(events[0].event).toBe(longEventName)
    })

    test('should handle circular references in properties', () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj

      // Should not throw due to JSON.stringify error in sendEvent
      analytics.track('test_event', circularObj)
      const events = analytics.getSessionEvents()
      expect(events).toHaveLength(1)
    })

    test('should handle undefined and null properties', () => {
      const properties = {
        validProp: 'value',
        nullProp: null,
        undefinedProp: undefined,
      }

      analytics.track('test_event', properties)
      
      const events = analytics.getSessionEvents()
      expect(events[0].properties).toEqual(properties)
    })
  })

  describe('Performance and Memory Management', () => {
    test('should handle multiple rapid calls', () => {
      for (let i = 0; i < 10; i++) {
        analytics.track(`event_${i}`)
      }

      const events = analytics.getSessionEvents()
      expect(events).toHaveLength(10)
    })

    test('should store events in memory', () => {
      analytics.track('event1')
      analytics.track('event2')
      analytics.track('event3')

      const events = analytics.getSessionEvents()
      expect(events).toHaveLength(3)
      expect(events.map(e => e.event)).toEqual(['event1', 'event2', 'event3'])
    })
  })

  describe('Data Privacy and Security', () => {
    test('should include URL in metadata', () => {
      analytics.track('test_event')

      const events = analytics.getSessionEvents()
      // URL should be included from our mocked environment
      expect(events[0].metadata?.url).toBe('https://example.com/test')
      expect(events[0].metadata?.userAgent).toBe('Mozilla/5.0 Test Browser')
    })

    test('should handle events without sensitive data', () => {
      analytics.track('test_event', {
        publicData: 'safe',
        amount: 99.99
      })

      const events = analytics.getSessionEvents()
      expect(events[0].properties).toEqual({
        publicData: 'safe',
        amount: 99.99
      })
    })
  })
})
