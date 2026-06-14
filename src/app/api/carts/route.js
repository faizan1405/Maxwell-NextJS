import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { AbandonedCart } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';
import { verifyCustomerCookie } from '../../../lib/customerAuth';

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

  const custSession = await verifyCustomerCookie(req);
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
    // Mongoose 9: prefer `returnDocument: 'after'` over deprecated `new: true`,
    // and chain `.lean()` instead of passing `lean` as a findOneAndUpdate option.
    const updated = await AbandonedCart.findOneAndUpdate(
      { id: existing.id },
      {
        $set: {
          items: items || [],
          email: email || existing.email || custSession?.email || null,
          updatedAt: now,
        }
      },
      { returnDocument: 'after' }
    ).lean();
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

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get('limit'), 10) || 20);
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';

  const now = Date.now();
  const query = {
    converted: false,
    updatedAt: { $lt: now - ABANDONED_THRESHOLD },
    'items.0': { $exists: true }
  };

  if (search.trim()) {
    const sQuery = search.trim();
    query.$or = [
      { email: { $regex: sQuery, $options: 'i' } },
      { guestId: { $regex: sQuery, $options: 'i' } }
    ];
  }

  const total = await AbandonedCart.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const sortQuery = {};
  if (sort === 'oldest') {
    sortQuery.updatedAt = 1;
  } else {
    sortQuery.updatedAt = -1;
  }

  const data = await AbandonedCart.find(query)
    .sort(sortQuery)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const allCarts = await AbandonedCart.find({
    converted: false,
    updatedAt: { $lt: now - ABANDONED_THRESHOLD },
    'items.0': { $exists: true }
  }).lean();

  const totalCarts = allCarts.length;
  const potentialRevenue = allCarts.reduce((s, c) =>
    s + (c.items || []).reduce((sv, i) => sv + (i.price || 0) * (i.qty || 1), 0), 0);
  const withEmail = allCarts.filter(c => c.email).length;

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    summary: {
      totalCarts,
      potentialRevenue,
      withEmail
    }
  }, { status: 200 });
}
