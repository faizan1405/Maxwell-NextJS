import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Review, Order, Customer, Product } from '../../../lib/models';
import { requireAdmin, verifySession } from '../../../lib/auth';
import { verifyCustomerCookie } from '../../../lib/customerAuth';

// Accepts canonical Product.id slug OR legacy ObjectId hex (older storefront callers).
async function resolveProductSlug(input) {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  const bySlug = await Product.findOne({ id: raw }).select('id').lean();
  if (bySlug?.id) return bySlug.id;
  if (/^[a-f0-9]{24}$/i.test(raw)) {
    try {
      const byOid = await Product.findById(raw).select('id').lean();
      if (byOid?.id) return byOid.id;
    } catch {}
  }
  return null;
}

export async function GET(req) {
  await connectToDatabase();
  
  const admin = verifySession(req);
  if (admin) {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit'), 10) || 20);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'newest';

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search.trim()) {
      const sQuery = search.trim();
      query.$or = [
        { customerName: { $regex: sQuery, $options: 'i' } },
        { email: { $regex: sQuery, $options: 'i' } },
        { text: { $regex: sQuery, $options: 'i' } },
        { productId: { $regex: sQuery, $options: 'i' } }
      ];
    }

    const total = await Review.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const sortQuery = {};
    if (sort === 'oldest') {
      sortQuery.createdAt = 1;
    } else {
      sortQuery.createdAt = -1;
    }

    const data = await Review.find(query)
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const allCount = await Review.countDocuments({});
    const pending = await Review.countDocuments({ status: 'pending' });
    const approved = await Review.countDocuments({ status: 'approved' });
    const rejected = await Review.countDocuments({ status: 'rejected' });
    const hidden = await Review.countDocuments({ status: 'hidden' });

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
      counts: {
        all: allCount,
        pending,
        approved,
        rejected,
        hidden
      }
    }, { status: 200 });
  }

  const reviews = await Review.find().lean();

  const stripPii = r => ({
    id: r.id, productId: r.productId, customerName: r.customerName,
    rating: r.rating, text: r.text, status: r.status,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  });

  const cust = await verifyCustomerCookie(req);
  const productIdRaw = req.nextUrl.searchParams.get('productId');

  let visible = reviews.filter(r =>
    r.status === 'approved' ||
    (cust && (r.customerId === cust.customerId || (r.email && cust.email && r.email.toLowerCase() === cust.email.toLowerCase())))
  );

  if (productIdRaw) {
    const productId = await resolveProductSlug(productIdRaw);
    if (!productId) return NextResponse.json([]);
    visible = visible.filter(r => r.productId === productId);
  }
  
  visible = visible.map(r => {
    const isOwn = cust && (r.customerId === cust.customerId || (r.email && cust.email && r.email.toLowerCase() === cust.email.toLowerCase()));
    return isOwn ? r : stripPii(r);
  });
  
  return NextResponse.json(visible);
}

export async function POST(req) {
  const custSession = await verifyCustomerCookie(req);
  if (!custSession) return NextResponse.json({ error: 'You must be signed in to leave a review.' }, { status: 401 });

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const { productId: productIdRaw, rating, text } = body;
  if (!productIdRaw) return NextResponse.json({ error: 'Product ID required.' }, { status: 400 });
  const productId = await resolveProductSlug(productIdRaw);
  if (!productId) return NextResponse.json({ error: 'Unknown product.' }, { status: 400 });
  const r = Number(rating);
  if (!r || r < 1 || r > 5) return NextResponse.json({ error: 'Rating must be between 1 and 5 stars.' }, { status: 400 });

  const allUserOrders = await Order.find({
    $or: [
      { customerId: custSession.customerId },
      { customerEmail: { $regex: new RegExp(`^${custSession.email}$`, 'i') } },
      { 'customer.email': { $regex: new RegExp(`^${custSession.email}$`, 'i') } }
    ]
  }).lean();

  const hasPurchased = allUserOrders.some(o => 
    ['processing', 'shipped', 'delivered'].includes(o.status) &&
    o.items && o.items.some(i => i.productId === productId)
  );
  
  if (!hasPurchased) {
    return NextResponse.json({ error: 'Only verified buyers can review this product.' }, { status: 403 });
  }
  
  const customer = await Customer.findOne({ id: custSession.customerId }).lean();
  
  const existing = await Review.findOne({
    customerId: custSession.customerId,
    productId: productId
  }).lean();

  if (existing) {
    const updated = await Review.findOneAndUpdate(
      { _id: existing._id },
      { $set: { rating: r, text: (text || '').trim().slice(0, 2000), status: 'pending', updatedAt: Date.now() } },
      { new: true, lean: true }
    );
    return NextResponse.json(updated);
  }

  const review = {
    id: `rev_${Date.now()}`,
    productId,
    customerId: custSession.customerId,
    email: custSession.email,
    customerName: customer?.name || custSession.email.split('@')[0],
    rating: r,
    text: (text || '').trim().slice(0, 2000),
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const created = await Review.create(review);
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const VALID = ['pending', 'approved', 'rejected', 'hidden'];
  if (status && !VALID.includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

  const existing = await Review.findOne({ id }).lean();
  if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const patch = { updatedAt: Date.now() };
  if (status !== undefined) patch.status = status;
  
  const updated = await Review.findOneAndUpdate(
    { id },
    { $set: patch },
    { new: true, lean: true }
  );

  return NextResponse.json(updated);
}

export async function DELETE(req) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await Review.findOneAndDelete({ id });
  return NextResponse.json({ ok: true });
}
