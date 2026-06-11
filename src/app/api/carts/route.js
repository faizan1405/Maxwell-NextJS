import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { AbandonedCart } from '../../../lib/models';
import { verifySession, verifyCustomerSession } from '../../../lib/auth';

const ABANDONED_THRESHOLD = 24 * 60 * 60 * 1000;   // 24 h
const GUEST_TTL           = 10 * 24 * 60 * 60 * 1000; // 10 days

function mergeItems(existing, incoming) {
  const map = {};
  [...(existing || []), ...(incoming || [])].forEach(item => {
    const key = `${item.id}-${item.variation || ''}`;
    if (map[key]) map[key] = { ...map[key], qty: map[key].qty + item.qty };
    else          map[key] = { ...item };
  });
  return Object.values(map);
}

export async function POST(req) {
  await connectToDatabase();
  let body = await req.json().catch(() => ({}));

  const custSession = verifyCustomerSession(req);
  const { guestId, items, email, action } = body;
  const now = Date.now();

  if (action === 'merge') {
    if (!custSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    let guestCart = null;
    if (guestId) {
      guestCart = await AbandonedCart.findOne({ guestId, converted: false }).lean();
    }
    const custCart = await AbandonedCart.findOne({ customerId: custSession.customerId, converted: false }).lean();

    if (guestCart) {
      const mergedItems = mergeItems(custCart?.items || [], guestCart.items || []);
      await AbandonedCart.updateOne({ id: guestCart.id }, { $set: { converted: true, updatedAt: now } });
      
      if (custCart) {
        await AbandonedCart.updateOne({ id: custCart.id }, { $set: { items: mergedItems, updatedAt: now } });
      } else {
        await AbandonedCart.create({
          id: `cart_${now}`,
          guestId: null,
          customerId: custSession.customerId,
          email: custSession.email,
          items: mergedItems,
          createdAt: now,
          updatedAt: now,
          converted: false
        });
      }
      return NextResponse.json({ items: mergedItems });
    }
    return NextResponse.json({ items: custCart?.items || [] });
  }

  if (action === 'convert') {
    if (custSession) {
      await AbandonedCart.updateMany({ customerId: custSession.customerId, converted: false }, { $set: { converted: true, updatedAt: now } });
    }
    if (guestId) {
      await AbandonedCart.updateMany({ guestId: guestId, converted: false }, { $set: { converted: true, updatedAt: now } });
    }
    return NextResponse.json({ ok: true });
  }

  let existing = null;
  if (custSession) {
    existing = await AbandonedCart.findOne({ customerId: custSession.customerId, converted: false }).lean();
  } else if (guestId) {
    existing = await AbandonedCart.findOne({ guestId: guestId, converted: false }).lean();
  }

  if (existing) {
    const updated = await AbandonedCart.findOneAndUpdate(
      { id: existing.id },
      {
        $set: {
          items: items || [],
          email: email || existing.email || custSession?.email || null,
          updatedAt: now,
        }
      },
      { new: true, lean: true }
    );
    return NextResponse.json(updated);
  }

  if (!items?.length) return NextResponse.json({ ok: true });

  const newCart = {
    id: `cart_${now}`,
    guestId: custSession ? null : (guestId || null),
    customerId: custSession?.customerId || null,
    email: email || custSession?.email || null,
    items: items || [],
    createdAt: now,
    updatedAt: now,
    converted: false,
  };

  await AbandonedCart.create(newCart);

  await AbandonedCart.deleteMany({ converted: false, updatedAt: { $lt: now - GUEST_TTL } });

  return NextResponse.json(newCart);
}

export async function GET(req) {
  await connectToDatabase();
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = Date.now();
  const abandoned = await AbandonedCart.find({
    converted: false,
    updatedAt: { $lt: now - ABANDONED_THRESHOLD },
    'items.0': { $exists: true }
  }).sort({ updatedAt: -1 }).lean();

  return NextResponse.json(abandoned);
}
