import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Coupon, Order } from '../../../lib/models';
import { requireAdmin, verifySession } from '../../../lib/auth';
import { verifyCustomerCookie } from '../../../lib/customerAuth';
import { formatZar } from '../../../utils/currency';

function calcDiscount(coupon, cartTotal) {
  if (coupon.type === 'percentage') {
    return Math.round(cartTotal * (coupon.value / 100) * 100) / 100;
  }
  return Math.min(coupon.value, cartTotal);
}

export async function GET(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  
  const coupons = await Coupon.find().lean();
  return NextResponse.json(coupons);
}

export async function POST(req) {
  await connectToDatabase();
  let body = await req.json().catch(() => ({}));

  if (body.action === 'validate') {
    const code = (body.code || '').toUpperCase().trim();
    const cartTotal = Number(body.cartTotal) || 0;
    if (!code) return NextResponse.json({ error: 'Coupon code required.' }, { status: 400 });

    const c = await Coupon.findOne({ code }).lean();

    if (!c || !c.active) return NextResponse.json({ error: 'Invalid or expired coupon code.' }, { status: 404 });
    if (c.expiresAt && Date.now() > c.expiresAt) return NextResponse.json({ error: 'This coupon has expired.' }, { status: 400 });
    if (c.maxUses > 0 && c.usedCount >= c.maxUses) return NextResponse.json({ error: 'This coupon has reached its usage limit.' }, { status: 400 });
    
    // Per-customer usage limit check
    const customerSession = await verifyCustomerCookie(req);
    const email = customerSession?.email || body.email || '';
    if (c.maxUsesPerCustomer > 0 && email) {
      const custUsageCount = await Order.countDocuments({
        couponId: c.id,
        'customer.email': email.toLowerCase().trim(),
        status: { $ne: 'cancelled' }
      });
      if (custUsageCount >= c.maxUsesPerCustomer) {
        return NextResponse.json({ error: 'You have reached the usage limit for this coupon.' }, { status: 400 });
      }
    }

    if (c.minOrderValue > 0 && cartTotal < c.minOrderValue) {
      return NextResponse.json({ error: `Minimum order value of ${formatZar(c.minOrderValue)} required.` }, { status: 400 });
    }

    // Product & category restrictions check
    let applicableTotal = cartTotal;
    if ((c.restrictToProducts?.length > 0 || c.restrictToCategories?.length > 0) && Array.isArray(body.items)) {
      let matchingTotal = 0;
      for (const item of body.items) {
        const prodId = item.productId;
        const cat = item.cat || '';
        const itemSubtotal = (item.price || 0) * (item.qty || 1);
        
        let match = false;
        if (c.restrictToProducts?.includes(prodId)) {
          match = true;
        }
        if (c.restrictToCategories?.includes(cat)) {
          match = true;
        }
        if (match) {
          matchingTotal += itemSubtotal;
        }
      }
      applicableTotal = matchingTotal;
      if (applicableTotal <= 0) {
        return NextResponse.json({ error: 'This coupon is not applicable to any products in your cart.' }, { status: 400 });
      }
    }

    const discount = calcDiscount(c, applicableTotal);
    return NextResponse.json({
      valid: true,
      couponId: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      discount,
    });
  }

  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const code = (body.code || '').toUpperCase().trim();
  if (!code) return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 });

  const existing = await Coupon.findOne({ code }).lean();
  if (existing) return NextResponse.json({ error: 'Coupon code already exists.' }, { status: 400 });

  const coupon = {
    id: `coup_${Date.now()}`,
    code,
    type: body.type === 'fixed' ? 'fixed' : 'percentage',
    value: Math.max(0, Number(body.value) || 0),
    minOrderValue: Math.max(0, Number(body.minOrderValue) || 0),
    maxUses: Math.max(0, Number(body.maxUses) || 0),
    maxUsesPerCustomer: Math.max(0, Number(body.maxUsesPerCustomer) || 0),
    usedCount: 0,
    expiresAt: body.expiresAt ? Number(body.expiresAt) : null,
    active: body.active !== false,
    restrictToProducts: Array.isArray(body.restrictToProducts) ? body.restrictToProducts : [],
    restrictToCategories: Array.isArray(body.restrictToCategories) ? body.restrictToCategories : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await Coupon.create(coupon);
  return NextResponse.json(coupon, { status: 201 });
}

export async function PATCH(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  let body = await req.json().catch(() => ({}));
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const c = await Coupon.findOne({ id }).lean();
  if (!c) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

  const patch = { updatedAt: Date.now() };
  if (body.code !== undefined) patch.code = String(body.code).toUpperCase().trim();
  if (body.type !== undefined) patch.type = body.type === 'fixed' ? 'fixed' : 'percentage';
  if (body.value !== undefined) patch.value = Math.max(0, Number(body.value) || 0);
  if (body.minOrderValue !== undefined) patch.minOrderValue = Math.max(0, Number(body.minOrderValue) || 0);
  if (body.maxUses !== undefined) patch.maxUses = body.maxUses == null ? 0 : Math.max(0, Number(body.maxUses) || 0);
  if (body.maxUsesPerCustomer !== undefined) patch.maxUsesPerCustomer = body.maxUsesPerCustomer == null ? 0 : Math.max(0, Number(body.maxUsesPerCustomer) || 0);
  if (body.expiresAt !== undefined) patch.expiresAt = body.expiresAt ? Number(body.expiresAt) : null;
  if (body.active !== undefined) patch.active = !!body.active;
  if (Array.isArray(body.restrictToProducts)) patch.restrictToProducts = body.restrictToProducts;
  if (Array.isArray(body.restrictToCategories)) patch.restrictToCategories = body.restrictToCategories;

  const updated = await Coupon.findOneAndUpdate({ id }, { $set: patch }, { new: true, lean: true });
  return NextResponse.json(updated);
}

export async function DELETE(req) {
  await connectToDatabase();
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body = await req.json().catch(() => ({}));
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await Coupon.findOneAndDelete({ id });
  return NextResponse.json({ ok: true });
}
