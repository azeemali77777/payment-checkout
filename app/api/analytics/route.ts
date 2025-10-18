import { NextRequest, NextResponse } from 'next/server';
import type { AnalyticsEvent } from '@/lib/analytics';

// In-memory storage for demo
const analyticsStore: AnalyticsEvent[] = [];

// Rate limiting for analytics
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkAnalyticsRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 100; 

  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    if (!checkAnalyticsRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse request body
    let eventData: AnalyticsEvent;
    try {
      eventData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Validate event data
    if (!eventData.event || !eventData.timestamp || !eventData.sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize and store event
    const sanitizedEvent: AnalyticsEvent = {
      event: eventData.event.substring(0, 100),
      timestamp: eventData.timestamp,
      sessionId: eventData.sessionId.substring(0, 100),
      userId: eventData.userId?.substring(0, 100),
      properties: eventData.properties ? 
        Object.fromEntries(
          Object.entries(eventData.properties).slice(0, 20)
        ) : undefined,
      metadata: eventData.metadata ? {
        userAgent: eventData.metadata.userAgent?.substring(0, 500),
        url: eventData.metadata.url?.substring(0, 500),
        referrer: eventData.metadata.referrer?.substring(0, 500)
      } : undefined
    };

    // Store event
    analyticsStore.push(sanitizedEvent);

    // Keep only last 10000 events to prevent memory issues
    if (analyticsStore.length > 10000) {
      analyticsStore.splice(0, analyticsStore.length - 10000);
    }

    // Log important events
    if (sanitizedEvent.event.includes('payment_') || sanitizedEvent.event.includes('checkout_')) {
      console.log('Important Analytics Event:', {
        event: sanitizedEvent.event,
        sessionId: sanitizedEvent.sessionId,
        timestamp: new Date(sanitizedEvent.timestamp).toISOString(),
        properties: sanitizedEvent.properties
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get analytics data (for admin/debugging)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const event = searchParams.get('event');
    const limit = parseInt(searchParams.get('limit') || '100');

    let filteredEvents = [...analyticsStore];

    // Filter by session ID
    if (sessionId) {
      filteredEvents = filteredEvents.filter(e => e.sessionId === sessionId);
    }

    // Filter by event type
    if (event) {
      filteredEvents = filteredEvents.filter(e => e.event.includes(event));
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    filteredEvents = filteredEvents.slice(0, limit);

    // Generate summary statistics
    const summary = {
      totalEvents: analyticsStore.length,
      filteredEvents: filteredEvents.length,
      uniqueSessions: new Set(analyticsStore.map(e => e.sessionId)).size,
      eventTypes: Object.entries(
        analyticsStore.reduce((acc, e) => {
          acc[e.event] = (acc[e.event] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort(([,a], [,b]) => b - a),
      timeRange: analyticsStore.length > 0 ? {
        oldest: Math.min(...analyticsStore.map(e => e.timestamp)),
        newest: Math.max(...analyticsStore.map(e => e.timestamp))
      } : null
    };

    return NextResponse.json({
      events: filteredEvents,
      summary
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
