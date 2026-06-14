import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { NewsletterSubscriber } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';

// Public Email Validation Regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightweight in-memory rate limiter cache
// Key: IP address (string), Value: Array of timestamps (numbers)
const rateLimitCache = new Map();

// Helper to clean up old timestamps and check limit
function isRateLimited(ip) {
  const now = Date.now();
  const timeframe = 15 * 60 * 1000; // 15 minutes
  const limit = 5; // max 5 submissions

  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, [now]);
    return false;
  }

  const timestamps = rateLimitCache.get(ip);
  const recentTimestamps = timestamps.filter(t => now - t < timeframe);
  
  if (recentTimestamps.length >= limit) {
    return true;
  }

  recentTimestamps.push(now);
  rateLimitCache.set(ip, recentTimestamps);
  
  // Periodically clean up cache to prevent memory leak
  if (rateLimitCache.size > 1000) {
    for (const [key, val] of rateLimitCache.entries()) {
      const filtered = val.filter(t => now - t < timeframe);
      if (filtered.length === 0) {
        rateLimitCache.delete(key);
      } else {
        rateLimitCache.set(key, filtered);
      }
    }
  }

  return false;
}

// GET: Admin-only List
export async function GET(req) {
  const session = verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = req.nextUrl;
    
    const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit'), 10) || 20);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { email: regex },
        { name: regex },
        { phone: regex },
        { source: regex },
      ];
    }

    const total = await NewsletterSubscriber.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    
    const data = await NewsletterSubscriber.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    console.error('[newsletter] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Public subscribe or resubscribe
export async function POST(req) {
  try {
    // 1. IP Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // 2. Honeypot check
    if (body.website && String(body.website).trim().length > 0) {
      return NextResponse.json({
        message: 'Thank you. You have been added to Amahle Blue updates.'
      });
    }

    const rawEmail = body.email || '';
    const email = String(rawEmail).trim().toLowerCase();

    // 3. Validations
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Email address is too long (maximum 254 characters).' }, { status: 400 });
    }

    const rawName = body.name || '';
    const name = String(rawName).trim();
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name is too long (maximum 100 characters).' }, { status: 400 });
    }

    const rawPhone = body.phone || '';
    const phone = String(rawPhone).trim();
    if (phone.length > 30) {
      return NextResponse.json({ error: 'Phone number is too long (maximum 30 characters).' }, { status: 400 });
    }

    const rawSource = body.source || 'footer';
    const source = String(rawSource).trim();
    if (source.length > 50) {
      return NextResponse.json({ error: 'Source is too long (maximum 50 characters).' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if duplicate exists
    let subscriber = await NewsletterSubscriber.findOne({ email });

    if (subscriber) {
      if (subscriber.status === 'subscribed') {
        return NextResponse.json({
          message: 'Thank you. You have been added to Amahle Blue updates.',
          subscriber
        });
      } else {
        // Resubscribe unsubscribed contact
        subscriber.status = 'subscribed';
        subscriber.unsubscribedAt = null;
        subscriber.subscribedAt = Date.now();
        subscriber.lastUpdatedAt = Date.now();
        await subscriber.save();
        return NextResponse.json({
          message: 'Thank you. You have been added to Amahle Blue updates.',
          subscriber
        });
      }
    }

    // Create new subscriber
    const newId = 'sub_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    subscriber = await NewsletterSubscriber.create({
      id: newId,
      email,
      name,
      phone,
      source,
      status: 'subscribed',
      subscribedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });

    return NextResponse.json({
      message: 'Thank you. You have been added to Amahle Blue updates.',
      subscriber
    });
  } catch (error) {
    console.error('[newsletter] POST error:', error);
    return NextResponse.json({ error: 'Unable to process your subscription at this time.' }, { status: 500 });
  }
}

// PATCH: Admin-only edit (notes, status toggles)
export async function PATCH(req) {
  const session = verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subscriber ID is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const subscriber = await NewsletterSubscriber.findOne({ id });
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 });
    }

    if (status !== undefined) {
      if (!['subscribed', 'unsubscribed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid subscriber status.' }, { status: 400 });
      }
      if (subscriber.status !== status) {
        subscriber.status = status;
        if (status === 'unsubscribed') {
          subscriber.unsubscribedAt = Date.now();
        } else {
          subscriber.unsubscribedAt = null;
          subscriber.subscribedAt = Date.now();
        }
      }
    }

    if (notes !== undefined) {
      subscriber.notes = String(notes);
    }

    subscriber.lastUpdatedAt = Date.now();
    await subscriber.save();

    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    console.error('[newsletter] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Admin-only delete
export async function DELETE(req) {
  const session = verifySession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Subscriber ID is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const result = await NewsletterSubscriber.deleteOne({ id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[newsletter] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
