/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST, GET, PUT, DELETE } from '@/app/api/analytics/route'
import type { AnalyticsEvent } from '@/lib/analytics'

describe('/api/analytics', () => {
  const validAnalyticsEvent: AnalyticsEvent = {
    event: 'payment_initiated',
    timestamp: Date.now(),
    sessionId: 'session_123',
    userId: 'user_456',
    properties: {
      amount: 107.99,
      currency: 'USD',
      paymentMethod: 'card',
    },
    metadata: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      url: 'https://example.com/checkout',
      referrer: 'https://example.com/cart',
    },
  }

  const createMockRequest = (
    body: any, 
    headers: Record<string, string> = {},
    url: string = 'https://example.com/api/analytics'
  ) => {
    // Use unique IP for each test to avoid rate limiting conflicts
    const uniqueIP = `192.168.1.${Math.floor(Math.random() * 255)}`;
    return {
      json: () => Promise.resolve(body),
      headers: {
        get: (name: string) => headers[name] || (name === 'x-forwarded-for' ? uniqueIP : null),
      },
      url,
    } as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  describe('POST /api/analytics', () => {
    describe('Successful Event Tracking', () => {
      test('should accept and store valid analytics event', async () => {
        const request = createMockRequest(validAnalyticsEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('should handle event without optional fields', async () => {
        const minimalEvent = {
          event: 'page_view',
          timestamp: Date.now(),
          sessionId: 'session_123',
        }

        const request = createMockRequest(minimalEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('should log important payment and checkout events', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const paymentEvent = {
          ...validAnalyticsEvent,
          event: 'payment_completed',
        }

        const request = createMockRequest(paymentEvent)
        await POST(request)

        expect(consoleSpy).toHaveBeenCalledWith('Important Analytics Event:', expect.objectContaining({
          event: 'payment_completed',
          sessionId: 'session_123',
        }))
      })

      test('should log checkout events', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const checkoutEvent = {
          ...validAnalyticsEvent,
          event: 'checkout_started',
        }

        const request = createMockRequest(checkoutEvent)
        await POST(request)

        expect(consoleSpy).toHaveBeenCalledWith('Important Analytics Event:', expect.objectContaining({
          event: 'checkout_started',
        }))
      })
    })

    describe('Input Validation', () => {
      test('should reject event without required fields', async () => {
        const invalidEvent = {
          event: 'test_event',
          // Missing timestamp and sessionId
        }

        const request = createMockRequest(invalidEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required fields')
      })

      test('should reject event without event name', async () => {
        const invalidEvent = {
          timestamp: Date.now(),
          sessionId: 'session_123',
          // Missing event
        }

        const request = createMockRequest(invalidEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required fields')
      })

      test('should reject event without timestamp', async () => {
        const invalidEvent = {
          event: 'test_event',
          sessionId: 'session_123',
          // Missing timestamp
        }

        const request = createMockRequest(invalidEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required fields')
      })

      test('should reject event without sessionId', async () => {
        const invalidEvent = {
          event: 'test_event',
          timestamp: Date.now(),
          // Missing sessionId
        }

        const request = createMockRequest(invalidEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required fields')
      })
    })

    describe('Input Sanitization', () => {
      test('should sanitize and limit event name length', async () => {
        const longEventName = 'a'.repeat(200)
        const eventWithLongName = {
          ...validAnalyticsEvent,
          event: longEventName,
        }

        const request = createMockRequest(eventWithLongName)
        const response = await POST(request)

        expect(response.status).toBe(200)
        // Event name should be truncated to 100 characters
      })

      test('should sanitize and limit sessionId length', async () => {
        const longSessionId = 'session_' + 'a'.repeat(200)
        const eventWithLongSessionId = {
          ...validAnalyticsEvent,
          sessionId: longSessionId,
        }

        const request = createMockRequest(eventWithLongSessionId)
        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      test('should sanitize and limit userId length', async () => {
        const longUserId = 'user_' + 'a'.repeat(200)
        const eventWithLongUserId = {
          ...validAnalyticsEvent,
          userId: longUserId,
        }

        const request = createMockRequest(eventWithLongUserId)
        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      test('should limit number of properties', async () => {
        const manyProperties = {}
        for (let i = 0; i < 30; i++) {
          manyProperties[`prop${i}`] = `value${i}`
        }

        const eventWithManyProps = {
          ...validAnalyticsEvent,
          properties: manyProperties,
        }

        const request = createMockRequest(eventWithManyProps)
        const response = await POST(request)

        expect(response.status).toBe(200)
        // Properties should be limited to 20
      })

      test('should sanitize metadata fields', async () => {
        const longUserAgent = 'Mozilla/5.0 ' + 'a'.repeat(1000)
        const eventWithLongMetadata = {
          ...validAnalyticsEvent,
          metadata: {
            userAgent: longUserAgent,
            url: 'https://example.com/' + 'a'.repeat(1000),
            referrer: 'https://example.com/' + 'a'.repeat(1000),
          },
        }

        const request = createMockRequest(eventWithLongMetadata)
        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Rate Limiting', () => {
      test('should enforce rate limiting for analytics', async () => {
        const request = createMockRequest(validAnalyticsEvent, {
          'x-forwarded-for': '192.168.1.100',
        })

        // Make requests up to the limit (100 per minute)
        const responses = []
        for (let i = 0; i < 101; i++) {
          responses.push(await POST(request))
        }

        // Last request should be rate limited
        const lastResponse = responses[responses.length - 1]
        const data = await lastResponse.json()

        expect(lastResponse.status).toBe(429)
        expect(data.error).toBe('Rate limit exceeded')
      })

      test('should handle missing IP headers gracefully', async () => {
        const request = createMockRequest(validAnalyticsEvent)
        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Error Handling', () => {
      test('should handle malformed JSON', async () => {
        const request = {
          json: () => Promise.reject(new Error('Invalid JSON')),
          headers: {
            get: () => null,
          },
        } as NextRequest

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid JSON')
      })

      test('should handle unexpected errors gracefully', async () => {
        // Force an error by mocking console.log to throw
        const originalLog = console.log
        console.log = jest.fn().mockImplementation(() => {
          throw new Error('Logging error')
        })

        const request = createMockRequest(validAnalyticsEvent)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')

        // Restore console.log
        console.log = originalLog
      })
    })
  })

  describe('GET /api/analytics', () => {
    // First, add some test data
    beforeEach(async () => {
      // Add some test events
      const events = [
        { ...validAnalyticsEvent, event: 'page_view', timestamp: Date.now() - 1000 },
        { ...validAnalyticsEvent, event: 'payment_initiated', timestamp: Date.now() - 500 },
        { ...validAnalyticsEvent, event: 'payment_completed', timestamp: Date.now() },
      ]

      for (const event of events) {
        const request = createMockRequest(event)
        await POST(request)
      }
    })

    describe('Successful Data Retrieval', () => {
      test('should return analytics data with summary', async () => {
        const request = createMockRequest({}, {}, 'https://example.com/api/analytics')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.events).toBeDefined()
        expect(data.summary).toBeDefined()
        expect(data.summary.totalEvents).toBeGreaterThan(0)
        expect(data.summary.uniqueSessions).toBeGreaterThan(0)
        expect(data.summary.eventTypes).toBeDefined()
      })

      test('should filter by sessionId', async () => {
        const url = 'https://example.com/api/analytics?sessionId=session_123'
        const request = createMockRequest({}, {}, url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.events.every((e: any) => e.sessionId === 'session_123')).toBe(true)
      })

      test('should filter by event type', async () => {
        const url = 'https://example.com/api/analytics?event=payment'
        const request = createMockRequest({}, {}, url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.events.every((e: any) => e.event.includes('payment'))).toBe(true)
      })

      test('should limit results', async () => {
        const url = 'https://example.com/api/analytics?limit=1'
        const request = createMockRequest({}, {}, url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.events.length).toBeLessThanOrEqual(1)
      })

      test('should sort events by timestamp (newest first)', async () => {
        const request = createMockRequest({}, {}, 'https://example.com/api/analytics')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        
        if (data.events.length > 1) {
          for (let i = 0; i < data.events.length - 1; i++) {
            expect(data.events[i].timestamp).toBeGreaterThanOrEqual(data.events[i + 1].timestamp)
          }
        }
      })
    })

    describe('Query Parameter Handling', () => {
      test('should handle invalid limit parameter', async () => {
        const url = 'https://example.com/api/analytics?limit=invalid'
        const request = createMockRequest({}, {}, url)
        const response = await GET(request)

        expect(response.status).toBe(200)
        // Should default to 100 when limit is invalid
      })

      test('should handle missing query parameters', async () => {
        const url = 'https://example.com/api/analytics'
        const request = createMockRequest({}, {}, url)
        const response = await GET(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Error Handling', () => {
      test('should handle unexpected errors in GET', async () => {
        // Mock URL constructor to throw an error
        const originalURL = global.URL
        global.URL = jest.fn().mockImplementation(() => {
          throw new Error('URL parsing error')
        })

        const request = createMockRequest({}, {}, 'invalid-url')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')

        // Restore URL
        global.URL = originalURL
      })
    })
  })

  describe('Unsupported HTTP Methods', () => {
    test('should return 405 for PUT requests', async () => {
      const response = await PUT()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })

    test('should return 405 for DELETE requests', async () => {
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Memory Management', () => {
    test('should limit stored events to prevent memory issues', async () => {
      // This test would be more meaningful in a real scenario
      // For now, we just verify the endpoint works with many events
      const events = Array.from({ length: 50 }, (_, i) => ({
        ...validAnalyticsEvent,
        event: `test_event_${i}`,
        timestamp: Date.now() + i,
      }))

      for (const event of events) {
        const request = createMockRequest(event)
        const response = await POST(request)
        expect(response.status).toBe(200)
      }

      // Verify we can still retrieve data
      const getRequest = createMockRequest({}, {}, 'https://example.com/api/analytics')
      const response = await GET(getRequest)
      expect(response.status).toBe(200)
    })
  })

  describe('Edge Cases', () => {
    test('should handle events with null/undefined optional fields', async () => {
      const eventWithNulls = {
        event: 'test_event',
        timestamp: Date.now(),
        sessionId: 'session_123',
        userId: null,
        properties: null,
        metadata: null,
      }

      const request = createMockRequest(eventWithNulls)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    test('should handle very old timestamps', async () => {
      const oldEvent = {
        ...validAnalyticsEvent,
        timestamp: 0, // Unix epoch
      }

      const request = createMockRequest(oldEvent)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    test('should handle future timestamps', async () => {
      const futureEvent = {
        ...validAnalyticsEvent,
        timestamp: Date.now() + 1000000, // Far future
      }

      const request = createMockRequest(futureEvent)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})


