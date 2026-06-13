import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { ShippingRate } from '../../../lib/models';
import { requireAdmin, verifySession } from '../../../lib/auth';

const DEFAULT_SHIPPING = [
  {
    id: 'default-rate',
    name: 'Standard Flat Rate',
    country: 'South Africa',
    region: '',
    charge: 85,
    minOrderAmount: 0,
    freeThreshold: 750,
    estimatedTime: '2-5 Business Days',
    status: 'active',
    isDefault: true,
    displayPriority: 999,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

async function getShippingRates() {
  let rates = await ShippingRate.find().lean();
  if (!rates || rates.length === 0) {
    await ShippingRate.create(DEFAULT_SHIPPING[0]);
    return DEFAULT_SHIPPING;
  }
  return rates;
}

export async function GET(req) {
  await connectToDatabase();
  const rates = await getShippingRates();
  
  const adminSession = verifySession(req);
  if (adminSession) {
    return NextResponse.json(rates);
  }
  
  return NextResponse.json(rates.filter(r => r.status === 'active'));
}

export async function POST(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  await getShippingRates(); // ensure initialized

  let body = await req.json().catch(() => ({}));
  
  const newRate = {
    id: 'rate_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
    name: body.name || 'New Rate',
    country: body.country || 'South Africa',
    region: body.region || '',
    charge: Number(body.charge) || 0,
    minOrderAmount: Number(body.minOrderAmount) || 0,
    freeThreshold: Number(body.freeThreshold) || 0,
    estimatedTime: body.estimatedTime || '',
    status: body.status === 'inactive' ? 'inactive' : 'active',
    isDefault: Boolean(body.isDefault),
    displayPriority: Number(body.displayPriority) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (newRate.charge < 0) return NextResponse.json({ error: 'Charge cannot be negative' }, { status: 400 });

  if (newRate.isDefault) {
    await ShippingRate.updateMany({}, { $set: { isDefault: false } });
  }

  await ShippingRate.create(newRate);
  return NextResponse.json(newRate, { status: 201 });
}

export async function PATCH(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  let body = await req.json().catch(() => ({}));
  
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing shipping rate ID' }, { status: 400 });

  const existing = await ShippingRate.findOne({ id }).lean();
  if (!existing) return NextResponse.json({ error: 'Shipping rate not found' }, { status: 404 });

  const patch = { updatedAt: Date.now() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.country !== undefined) patch.country = body.country;
  if (body.region !== undefined) patch.region = body.region;
  if (body.charge !== undefined) patch.charge = Math.max(0, Number(body.charge) || 0);
  if (body.minOrderAmount !== undefined) patch.minOrderAmount = Number(body.minOrderAmount) || 0;
  if (body.freeThreshold !== undefined) patch.freeThreshold = Number(body.freeThreshold) || 0;
  if (body.estimatedTime !== undefined) patch.estimatedTime = body.estimatedTime;
  if (body.status !== undefined) patch.status = body.status;
  if (body.displayPriority !== undefined) patch.displayPriority = Number(body.displayPriority) || 0;
  
  if (body.isDefault !== undefined) {
    patch.isDefault = Boolean(body.isDefault);
    if (patch.isDefault) {
      await ShippingRate.updateMany({ id: { $ne: id } }, { $set: { isDefault: false } });
    }
  }

  const updated = await ShippingRate.findOneAndUpdate({ id }, { $set: patch }, { new: true, lean: true });
  return NextResponse.json(updated);
}

export async function DELETE(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  let body = await req.json().catch(() => ({}));
  
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing shipping rate ID' }, { status: 400 });

  const existing = await ShippingRate.findOne({ id }).lean();
  if (!existing) return NextResponse.json({ error: 'Shipping rate not found' }, { status: 404 });

  await ShippingRate.findOneAndDelete({ id });
  return NextResponse.json({ success: true });
}
