import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Customer } from '../../../lib/models';
import { verifyCustomerCookie } from '../../../lib/customerAuth';

export async function GET(req) {
  await connectToDatabase();
  const session = await verifyCustomerCookie(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customer = await Customer.findOne({ id: session.customerId });
  if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  return NextResponse.json({ ok: true, customer });
}

export async function PATCH(req) {
  await connectToDatabase();
  const session = await verifyCustomerCookie(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body  = await req.json();
    const patch = {};
    if (body.name  !== undefined) patch.name  = String(body.name).trim().slice(0, 100);
    if (body.phone !== undefined) patch.phone = String(body.phone).trim().slice(0, 30);

    const customer = await Customer.findOneAndUpdate(
      { id: session.customerId },
      { $set: patch },
      { new: true }
    );

    if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    return NextResponse.json({ ok: true, customer });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await connectToDatabase();
  const session = await verifyCustomerCookie(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body     = await req.json();
    const { action } = body || {};
    const customer = await Customer.findOne({ id: session.customerId });
    if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    if (action === 'addAddress') {
      const { address } = body;
      if (!address || !address.line || !address.city) {
        return NextResponse.json({ error: 'Address line and city are required.' }, { status: 400 });
      }
      const newAddr = {
        id:         `addr_${Date.now()}`,
        label:      String(address.label || 'Home').trim(),
        line:       String(address.line).trim(),
        city:       String(address.city).trim(),
        province:   String(address.province || '').trim(),
        postalCode: String(address.postalCode || '').trim(),
        isDefault:  customer.addresses.length === 0 || !!address.isDefault,
      };
      const addresses = customer.addresses.map(a =>
        newAddr.isDefault ? { ...a, isDefault: false } : a
      );
      addresses.push(newAddr);
      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    if (action === 'updateAddress') {
      const { addressId, address } = body;
      if (!addressId) return NextResponse.json({ error: 'addressId is required.' }, { status: 400 });
      const addresses = customer.addresses.map(a => {
        if (a.id !== addressId) return address?.isDefault ? { ...a, isDefault: false } : a;
        return {
          ...a,
          label:      address.label      !== undefined ? String(address.label).trim()      : a.label,
          line:       address.line       !== undefined ? String(address.line).trim()       : a.line,
          city:       address.city       !== undefined ? String(address.city).trim()       : a.city,
          province:   address.province   !== undefined ? String(address.province).trim()   : a.province,
          postalCode: address.postalCode !== undefined ? String(address.postalCode).trim() : a.postalCode,
          isDefault:  address.isDefault  !== undefined ? !!address.isDefault               : a.isDefault,
        };
      });
      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    if (action === 'deleteAddress') {
      const { addressId } = body;
      if (!addressId) return NextResponse.json({ error: 'addressId is required.' }, { status: 400 });
      let addresses = customer.addresses.filter(a => a.id !== addressId);
      if (addresses.length > 0 && !addresses.some(a => a.isDefault)) addresses[0].isDefault = true;
      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    if (action === 'setDefaultAddress') {
      const { addressId } = body;
      if (!addressId) return NextResponse.json({ error: 'addressId is required.' }, { status: 400 });
      const addresses = customer.addresses.map(a => ({ ...a, isDefault: a.id === addressId }));
      await Customer.updateOne({ id: session.customerId }, { $set: { addresses } });
      return NextResponse.json({ ok: true, customer: await Customer.findOne({ id: session.customerId }) });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-filename',
    },
  });
}
