import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Review, Order, Customer, Product } from '../../../lib/models';
import { requireAdmin, verifySession } from '../../../lib/auth';
import { verifyCustomerCookie } from '../../../lib/customerAuth';

const ALLOWED_SOURCES = ['website', 'whatsapp', 'email', 'manual', ''];

function deriveInitials(name) {
  return (name || '').trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// Accepts canonical Product.id slug OR legacy ObjectId hex (older storefront callers).
async function resolveProductSlug(input) {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return null;
  const bySlug = await Product.findOne({ id: raw }).select('id name').lean();
  if (bySlug?.id) return { id: bySlug.id, name: bySlug.name };
  if (/^[a-f0-9]{24}$/i.test(raw)) {
    try {
      const byOid = await Product.findById(raw).select('id name').lean();
      if (byOid?.id) return { id: byOid.id, name: byOid.name };
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
    const rating = searchParams.get('rating');
    const verified = searchParams.get('verified');
    const productId = searchParams.get('productId') || '';
    const homepage = searchParams.get('homepage');

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (rating && !Number.isNaN(Number(rating))) {
      query.rating = Number(rating);
    }
    if (verified === 'true') query.isVerified = true;
    if (verified === 'false') query.isVerified = false;
    if (productId.trim()) query.productId = productId.trim();
    if (homepage === 'true') query.showOnHomepage = true;
    if (homepage === 'false') query.showOnHomepage = false;

    if (search.trim()) {
      const sQuery = search.trim();
      query.$or = [
        { customerName: { $regex: sQuery, $options: 'i' } },
        { email: { $regex: sQuery, $options: 'i' } },
        { text: { $regex: sQuery, $options: 'i' } },
        { productId: { $regex: sQuery, $options: 'i' } },
        { productName: { $regex: sQuery, $options: 'i' } },
        { location: { $regex: sQuery, $options: 'i' } },
      ];
    }

    const total = await Review.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const sortQuery = {};
    if (sort === 'oldest') sortQuery.createdAt = 1;
    else sortQuery.createdAt = -1;

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
    const verifiedCount = await Review.countDocuments({ isVerified: true });
    const homepageCount = await Review.countDocuments({ showOnHomepage: true, status: 'approved' });

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      counts: {
        all: allCount,
        pending,
        approved,
        rejected,
        hidden,
        verified: verifiedCount,
        homepage: homepageCount,
      },
    }, { status: 200 });
  }

  // Public path
  const { searchParams } = req.nextUrl;
  const productIdRaw = searchParams.get('productId');
  const homepageOnly = searchParams.get('homepage') === '1' || searchParams.get('homepage') === 'true';
  const limitParam = Math.min(Math.max(parseInt(searchParams.get('limit'), 10) || 50, 1), 100);

  const stripPii = r => ({
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    customerName: r.customerName,
    customerInitials: r.customerInitials,
    customerPhoto: r.customerPhoto,
    location: r.location,
    rating: r.rating,
    text: r.text,
    status: r.status,
    isVerified: !!r.isVerified,
    source: r.source,
    showOnHomepage: !!r.showOnHomepage,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

  if (homepageOnly) {
    let docs = await Review.find({ showOnHomepage: true, status: 'approved' })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limitParam)
      .lean();
    if (docs.length === 0) {
      docs = await Review.find({ status: 'approved' })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(limitParam)
        .lean();
    }
    return NextResponse.json(docs.map(stripPii));
  }

  const reviews = await Review.find().lean();

  const cust = await verifyCustomerCookie(req);

  let visible = reviews.filter(r =>
    r.status === 'approved' ||
    (cust && (r.customerId === cust.customerId || (r.email && cust.email && r.email.toLowerCase() === cust.email.toLowerCase())))
  );

  if (productIdRaw) {
    const resolved = await resolveProductSlug(productIdRaw);
    if (!resolved) return NextResponse.json([]);
    visible = visible.filter(r => r.productId === resolved.id);
  }

  visible = visible.map(r => {
    const isOwn = cust && (r.customerId === cust.customerId || (r.email && cust.email && r.email.toLowerCase() === cust.email.toLowerCase()));
    return isOwn ? r : stripPii(r);
  });

  return NextResponse.json(visible);
}

export async function POST(req) {
  await connectToDatabase();

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = verifySession(req);

  // Admin manual create
  if (admin) {
    const r = Number(body.rating);
    if (!r || r < 1 || r > 5) return NextResponse.json({ error: 'Rating must be between 1 and 5 stars.' }, { status: 400 });
    if (!String(body.customerName || '').trim()) return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });

    let productId = '';
    let productName = String(body.productName || '').trim();
    if (body.productId) {
      const resolved = await resolveProductSlug(body.productId);
      if (resolved) {
        productId = resolved.id;
        if (!productName) productName = resolved.name || '';
      } else {
        productId = String(body.productId).trim();
      }
    }

    const source = ALLOWED_SOURCES.includes(body.source) ? body.source : 'manual';
    const customerName = String(body.customerName).trim();
    const customerInitials = String(body.customerInitials || '').trim() || deriveInitials(customerName);

    const review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productId,
      productName,
      customerId: null,
      email: String(body.email || '').trim(),
      customerName,
      customerInitials,
      customerPhoto: String(body.customerPhoto || '').trim(),
      location: String(body.location || '').trim(),
      rating: r,
      text: String(body.text || '').trim().slice(0, 2000),
      status: body.status && ['pending', 'approved', 'rejected', 'hidden'].includes(body.status) ? body.status : 'approved',
      isVerified: !!body.isVerified,
      source,
      showOnHomepage: !!body.showOnHomepage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const created = await Review.create(review);
    return NextResponse.json(created, { status: 201 });
  }

  // Customer self-submitted review (existing flow)
  const custSession = await verifyCustomerCookie(req);
  if (!custSession) return NextResponse.json({ error: 'You must be signed in to leave a review.' }, { status: 401 });

  const { productId: productIdRaw, rating, text } = body;
  if (!productIdRaw) return NextResponse.json({ error: 'Product ID required.' }, { status: 400 });
  const resolved = await resolveProductSlug(productIdRaw);
  if (!resolved) return NextResponse.json({ error: 'Unknown product.' }, { status: 400 });
  const productId = resolved.id;
  const r = Number(rating);
  if (!r || r < 1 || r > 5) return NextResponse.json({ error: 'Rating must be between 1 and 5 stars.' }, { status: 400 });

  const allUserOrders = await Order.find({
    $or: [
      { customerId: custSession.customerId },
      { customerEmail: { $regex: new RegExp(`^${custSession.email}$`, 'i') } },
      { 'customer.email': { $regex: new RegExp(`^${custSession.email}$`, 'i') } },
    ],
  }).lean();

  const hasPurchased = allUserOrders.some(o =>
    ['processing', 'shipped', 'delivered'].includes(o.status) &&
    o.items && o.items.some(i => i.productId === productId)
  );

  if (!hasPurchased) {
    return NextResponse.json({ error: 'Only verified buyers can review this product.' }, { status: 403 });
  }

  const customer = await Customer.findOne({ id: custSession.customerId }).lean();
  const customerName = customer?.name || custSession.email.split('@')[0];

  const existing = await Review.findOne({
    customerId: custSession.customerId,
    productId,
  }).lean();

  if (existing) {
    const updated = await Review.findOneAndUpdate(
      { _id: existing._id },
      { $set: { rating: r, text: String(text || '').trim().slice(0, 2000), status: 'pending', updatedAt: Date.now() } },
      { new: true, lean: true }
    );
    return NextResponse.json(updated);
  }

  const review = {
    id: `rev_${Date.now()}`,
    productId,
    productName: resolved.name || '',
    customerId: custSession.customerId,
    email: custSession.email,
    customerName,
    customerInitials: deriveInitials(customerName),
    rating: r,
    text: String(text || '').trim().slice(0, 2000),
    status: 'pending',
    isVerified: true,
    source: 'website',
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

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const existing = await Review.findOne({ id }).lean();
  if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const patch = { updatedAt: Date.now() };

  if (body.status !== undefined) {
    const VALID = ['pending', 'approved', 'rejected', 'hidden'];
    if (!VALID.includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    patch.status = body.status;
  }

  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (!r || r < 1 || r > 5) return NextResponse.json({ error: 'Rating must be 1–5.' }, { status: 400 });
    patch.rating = r;
  }

  if (body.customerName !== undefined) {
    patch.customerName = String(body.customerName).trim();
    if (body.customerInitials === undefined) {
      patch.customerInitials = deriveInitials(patch.customerName);
    }
  }
  if (body.customerInitials !== undefined) patch.customerInitials = String(body.customerInitials).trim().slice(0, 4).toUpperCase();
  if (body.customerPhoto !== undefined) patch.customerPhoto = String(body.customerPhoto).trim();
  if (body.email !== undefined) patch.email = String(body.email).trim();
  if (body.location !== undefined) patch.location = String(body.location).trim();
  if (body.text !== undefined) patch.text = String(body.text).trim().slice(0, 2000);
  if (body.isVerified !== undefined) patch.isVerified = !!body.isVerified;
  if (body.showOnHomepage !== undefined) patch.showOnHomepage = !!body.showOnHomepage;
  if (body.source !== undefined) {
    if (!ALLOWED_SOURCES.includes(body.source)) return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
    patch.source = body.source;
  }

  if (body.productId !== undefined) {
    const raw = String(body.productId || '').trim();
    if (!raw) {
      patch.productId = '';
      if (body.productName === undefined) patch.productName = '';
    } else {
      const resolved = await resolveProductSlug(raw);
      if (resolved) {
        patch.productId = resolved.id;
        if (body.productName === undefined || !String(body.productName).trim()) {
          patch.productName = resolved.name || '';
        }
      } else {
        patch.productId = raw;
      }
    }
  }
  if (body.productName !== undefined) patch.productName = String(body.productName).trim();

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
