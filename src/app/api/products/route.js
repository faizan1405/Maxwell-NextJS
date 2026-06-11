import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose';
import { Product } from '../../../lib/models';
import { verifySession } from '../../../lib/auth';
import { del } from '@vercel/blob';

function isVercelBlob(url) {
  return typeof url === 'string' && url.includes('.vercel-storage.com');
}

function sanitize(input) {
  const VALID_STATUS = ['active','draft','archived'];
  const VALID_CAT    = ['household','sanitiser','car','car-exterior','industrial'];
  const out = {};
  if (input.name      !== undefined) out.name      = String(input.name).trim().slice(0, 120);
  if (input.cat       !== undefined) out.cat       = VALID_CAT.includes(input.cat) ? input.cat : 'household';
  if (input.sub       !== undefined) out.sub       = String(input.sub).trim().slice(0, 200);
  if (input.price     !== undefined) out.price     = Math.max(0, Number(input.price) || 0);
  if (input.was       !== undefined) out.was       = input.was == null ? null : Math.max(0, Number(input.was) || 0);
  if (input.size      !== undefined) out.size      = String(input.size).trim().slice(0, 40);
  if (input.sku       !== undefined) out.sku       = String(input.sku).trim().slice(0, 60);
  if (input.scent     !== undefined) out.scent     = input.scent == null ? null : String(input.scent).slice(0, 80);
  if (input.badge     !== undefined) out.badge     = input.badge == null ? null : String(input.badge).slice(0, 40);
  if (input.img       !== undefined) out.img       = String(input.img).slice(0, 1024);
  if (Array.isArray(input.media)) {
    out.media = input.media.slice(0, 12).map((m, i) => ({
      id:         String(m.id || `${Date.now()}-${i}`).slice(0, 60),
      type:       m.type === 'video' ? 'video' : 'image',
      url:        String(m.url || '').slice(0, 1024),
      storageKey: m.storageKey ? String(m.storageKey).slice(0, 500) : null,
      altText:    m.altText    ? String(m.altText).slice(0, 200)    : '',
      sortOrder:  Number.isInteger(m.sortOrder) ? m.sortOrder : i,
      isPrimary:  !!m.isPrimary,
      fileName:   m.fileName   ? String(m.fileName).slice(0, 200)   : '',
      mimeType:   m.mimeType   ? String(m.mimeType).slice(0, 50)    : '',
      fileSize:   Math.max(0, Number(m.fileSize) || 0),
      createdAt:  m.createdAt  || Date.now(),
    }));
    const primary = out.media.find(m => m.isPrimary && m.type === 'image')
                 || out.media.find(m => m.type === 'image');
    if (primary) out.img = primary.url;
  }
  if (input.desc      !== undefined) out.desc      = String(input.desc).slice(0, 4000);
  if (input.stock     !== undefined) out.stock     = Math.max(0, parseInt(input.stock, 10) || 0);
  if (input.lowStockThreshold !== undefined) out.lowStockThreshold = Math.max(0, parseInt(input.lowStockThreshold, 10) || 0);
  if (input.status    !== undefined) out.status    = VALID_STATUS.includes(input.status) ? input.status : 'draft';
  if (input.outOfStock !== undefined) out.outOfStock = !!input.outOfStock;
  if (Array.isArray(input.benefits)) out.benefits  = input.benefits.filter(Boolean).slice(0, 10).map(b => String(b).slice(0, 200));
  if (Array.isArray(input.variants)) out.variants  = input.variants.slice(0, 12).map(v => ({
    name:  String(v.name || '').slice(0, 40),
    price: Math.max(0, Number(v.price) || 0),
    stock: Math.max(0, parseInt(v.stock, 10) || 0),
    outOfStock: !!v.outOfStock,
  }));
  return out;
}

export async function GET(req) {
  await connectToDatabase();
  const all = req.nextUrl.searchParams.get('all');
  
  let filter = {};
  if (!all) {
    filter.status = 'active';
  }
  
  const products = await Product.find(filter).lean();
  
  // Apply virtual media migration mapping
  const mapped = products.map(p => {
    if (p.media && p.media.length > 0) return p;
    if (!p.img) return { ...p, media: [] };
    return {
      ...p,
      media: [{
        id:         p.id + '-img',
        type:       'image',
        url:        p.img,
        storageKey: null,
        altText:    p.name || '',
        sortOrder:  0,
        isPrimary:  true,
        fileName:   p.img.split('/').pop(),
        mimeType:   p.img.endsWith('.png') ? 'image/png' : 'image/jpeg',
        fileSize:   0,
        createdAt:  p.createdAt || Date.now(),
      }],
    };
  });
  
  return NextResponse.json(mapped);
}

export async function POST(req) {
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const clean = sanitize(body);
  if (!clean.name)                return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
  if (!('price' in clean))        return NextResponse.json({ error: 'Price is required.' }, { status: 400 });
  if (!clean.sku)                 return NextResponse.json({ error: 'SKU is required.' }, { status: 400 });
  
  const newProduct = {
    rating: 4.8, reviews: 0,
    ...clean,
    id: Date.now().toString(),
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  
  const created = await Product.create(newProduct);
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req) {
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const { id, adjustment } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  const product = await Product.findOne({ id }).lean();
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  let updated;
  if (adjustment) {
    const { variation, mode, qty, reason } = adjustment;
    const numQty = parseInt(qty, 10) || 0;
    
    let prevStock = 0;
    let newStock = 0;
    let variants = product.variants ? [...product.variants] : [];
    
    if (variation) {
      if (!variants || variants.length === 0) {
        return NextResponse.json({ error: 'Product does not support variations.' }, { status: 400 });
      }
      const vIdx = variants.findIndex(v => v.name === variation);
      if (vIdx === -1) {
        return NextResponse.json({ error: `Variation "${variation}" not found.` }, { status: 400 });
      }
      
      prevStock = variants[vIdx].stock || 0;
      if (mode === 'increase') newStock = prevStock + numQty;
      else if (mode === 'reduce') newStock = Math.max(0, prevStock - numQty);
      else if (mode === 'set') newStock = Math.max(0, numQty);
      else return NextResponse.json({ error: 'Invalid adjustment mode.' }, { status: 400 });
      
      variants[vIdx].stock = newStock;
      product.variants = variants;
      product.stock = variants.reduce((acc, v) => acc + (v.stock || 0), 0);
    } else {
      prevStock = product.stock || 0;
      if (mode === 'increase') newStock = prevStock + numQty;
      else if (mode === 'reduce') newStock = Math.max(0, prevStock - numQty);
      else if (mode === 'set') newStock = Math.max(0, numQty);
      else return NextResponse.json({ error: 'Invalid adjustment mode.' }, { status: 400 });
      
      product.stock = newStock;
      if (variants && variants.length === 1) {
        variants[0].stock = newStock;
        product.variants = variants;
      }
    }
    
    updated = await Product.findOneAndUpdate(
      { id },
      { $set: { stock: product.stock, variants: product.variants, updatedAt: Date.now() } },
      { new: true, lean: true }
    );
  } else {
    const sanitized = sanitize(body);
    if (sanitized.variants && sanitized.variants.length > 0) {
      sanitized.stock = sanitized.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
    }
    updated = await Product.findOneAndUpdate(
      { id },
      { $set: { ...sanitized, updatedAt: Date.now() } },
      { new: true, lean: true }
    );
  }
  
  return NextResponse.json(updated);
}

export async function DELETE(req) {
  const session = verifySession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // if (session.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 }); // Wait, old code had this, keep it:
  if (session.role && session.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  await connectToDatabase();
  
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  const product = await Product.findOne({ id }).lean();
  
  if (product && Array.isArray(product.media)) {
    const blobUrls = product.media.map(m => m.url).filter(isVercelBlob);
    if (blobUrls.length) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        await del(blobUrls, { token });
      } catch (e) {
        console.error('[/api/products DELETE] media cleanup error:', e.message);
      }
    }
  }

  await Product.findOneAndDelete({ id });
  return NextResponse.json({ ok: true });
}
