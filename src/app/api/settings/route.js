import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Settings, StockHistory } from '../../../lib/models';
import { requireAdmin, requireSession, verifySession } from '../../../lib/auth';

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

const DEFAULT_SETTINGS = {
  cod: {
    enabled: true,
    description: 'Pay in cash when your order is delivered.',
    minOrderAmount: 0,
    maxOrderAmount: 0,
    codFee: 0,
    locationRestrictions: [],
    productRestrictions: [],
  },
  eft: {
    enabled: true,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'Current',
    swiftCode: '',
    instructions: '',
    allowProofUpload: false,
  },
  shipping: {
    freeThreshold: 750,
    flatFee: 85,
    provinceRates: {
      'Gauteng':       75,
      'Western Cape':  120,
      'KwaZulu-Natal': 120,
      'Eastern Cape':  130,
      'Mpumalanga':    100,
      'Limpopo':       110,
      'North West':    100,
      'Free State':    110,
      'Northern Cape': 140,
    },
  },
  business: {
    name:      'Amahle Blue',
    tagline:   'Cleaning Solutions',
    vatNumber: '4930324332',
    email:     'info@amahle-blue.co.za',
    phone:     '067 101 4345',
    address:   'Unit H, 13 Main Reef Road, Dunswart, Boksburg, Gauteng, South Africa',
  },
  invoiceCounter: 1000,
  orderCounter: 10000,
};

async function getSettings() {
  const doc = await Settings.findOne({ key: 'global_settings' });
  if (!doc) {
    const newDoc = await Settings.create({ key: 'global_settings', value: DEFAULT_SETTINGS });
    return newDoc.value;
  }
  return deepMerge(DEFAULT_SETTINGS, doc.value);
}

export async function GET(req) {
  await connectToDatabase();
  try {
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get('resource');
    const adminSession = verifySession(req);

    // 1. Stock History resource delegate
    if (resource === 'stock-history') {
      const auth = requireSession(req);
      if (auth.response) return auth.response;
      const history = await StockHistory.find({}).sort({ createdAt: -1 });
      
      // Adapt field names for legacy frontend compatibility:
      // prevStock -> prevStock, newStock -> updatedStock, createdAt -> timestamp
      const adapted = history.map(h => ({
        id: h.id,
        productId: h.productId,
        productName: h.reason.startsWith('Order') ? 'Product Sale' : 'Inventory Adjust', // Fallback or search name later
        variation: h.variationName,
        prevStock: h.previousStock,
        updatedStock: h.newStock,
        reason: h.reason,
        timestamp: new Date(h.createdAt).getTime(),
      }));
      
      return NextResponse.json(adapted);
    }

    // 2. Default Store Settings read
    const s = await getSettings();
    if (adminSession) {
      // Full details for admin
      return NextResponse.json({
        cod: s.cod,
        eft: s.eft,
        shipping: s.shipping,
        business: s.business,
      });
    }

    // Public view: strip bank account details & limits
    return NextResponse.json({
      cod: {
        enabled: s.cod.enabled,
        description: s.cod.description,
        codFee: s.cod.codFee,
        minOrderAmount: s.cod.minOrderAmount,
        maxOrderAmount: s.cod.maxOrderAmount,
      },
      eft: {
        enabled: s.eft.enabled,
      },
      shipping: s.shipping,
      business: s.business,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  try {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  await connectToDatabase();
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const allowed = {};

    if (body.business) allowed.business = body.business;

    if (body.shipping) {
      allowed.shipping = {};
      if (body.shipping.freeThreshold !== undefined)
        allowed.shipping.freeThreshold = Math.max(0, Number(body.shipping.freeThreshold) || 0);
      if (body.shipping.flatFee !== undefined)
        allowed.shipping.flatFee = Math.max(0, Number(body.shipping.flatFee) || 0);
      if (body.shipping.provinceRates && typeof body.shipping.provinceRates === 'object') {
        allowed.shipping.provinceRates = {};
        for (const [k, v] of Object.entries(body.shipping.provinceRates)) {
          allowed.shipping.provinceRates[String(k)] = Math.max(0, Number(v) || 0);
        }
      }
    }

    if (body.cod) {
      allowed.cod = {};
      if (typeof body.cod.enabled === 'boolean') allowed.cod.enabled = body.cod.enabled;
      if (body.cod.description !== undefined) allowed.cod.description = String(body.cod.description || '').slice(0, 500);
      if (body.cod.codFee !== undefined) allowed.cod.codFee = Math.max(0, Number(body.cod.codFee) || 0);
      if (body.cod.minOrderAmount !== undefined) allowed.cod.minOrderAmount = Math.max(0, Number(body.cod.minOrderAmount) || 0);
      if (body.cod.maxOrderAmount !== undefined) allowed.cod.maxOrderAmount = Math.max(0, Number(body.cod.maxOrderAmount) || 0);
      if (Array.isArray(body.cod.locationRestrictions)) allowed.cod.locationRestrictions = body.cod.locationRestrictions;
      if (Array.isArray(body.cod.productRestrictions)) allowed.cod.productRestrictions = body.cod.productRestrictions;
    }

    if (body.eft) {
      allowed.eft = {};
      if (typeof body.eft.enabled === 'boolean') allowed.eft.enabled = body.eft.enabled;
      if (body.eft.bankName !== undefined) allowed.eft.bankName = String(body.eft.bankName || '').slice(0, 100);
      if (body.eft.accountHolder !== undefined) allowed.eft.accountHolder = String(body.eft.accountHolder || '').slice(0, 100);
      if (body.eft.accountNumber !== undefined) allowed.eft.accountNumber = String(body.eft.accountNumber || '').slice(0, 50);
      if (body.eft.branchCode !== undefined) allowed.eft.branchCode = String(body.eft.branchCode || '').slice(0, 20);
      if (body.eft.accountType !== undefined) allowed.eft.accountType = String(body.eft.accountType || '').slice(0, 50);
      if (body.eft.swiftCode !== undefined) allowed.eft.swiftCode = String(body.eft.swiftCode || '').slice(0, 20);
      if (body.eft.instructions !== undefined) allowed.eft.instructions = String(body.eft.instructions || '').slice(0, 1000);
      if (typeof body.eft.allowProofUpload === 'boolean') allowed.eft.allowProofUpload = body.eft.allowProofUpload;
    }

    const currentDoc = await Settings.findOne({ key: 'global_settings' });
    const current = currentDoc ? currentDoc.value : DEFAULT_SETTINGS;
    const updated = deepMerge(current, allowed);

    await Settings.findOneAndUpdate(
      { key: 'global_settings' },
      { $set: { value: updated } },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      cod: updated.cod,
      eft: updated.eft,
      shipping: updated.shipping,
      business: updated.business,
    });
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename',
    },
  });
}
export { getSettings };
