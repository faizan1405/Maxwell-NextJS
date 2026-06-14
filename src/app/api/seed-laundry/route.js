import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { connectToDatabase } from '../../../lib/mongoose';
import { Product, Category } from '../../../lib/models';

const LAUNDRY_CATEGORY = {
  id: 'laundry',
  name: 'Laundry Products',
  short: 'Laundry',
  icon: 'Sparkles',
  blurb: 'Washing powders and laundry solutions for homes and businesses.',
  accent: '#0891B2',
  status: 'active',
  displayOrder: 7,
};

const LAUNDRY_PRODUCTS = [
  {
    id: 'demo-brite-shine-washing-powder-5kg',
    name: "Brite n' Shine Washing Powder — 5kg",
    cat: 'laundry',
    sub: 'Everyday laundry washing powder',
    price: 0,
    was: null,
    size: '5kg',
    rating: 0,
    reviews: 0,
    badge: null,
    img: 'https://images.unsplash.com/photo-1642429947963-f04215ed5577?w=800&q=80',
    desc: 'Powerful everyday washing powder for fresh, clean laundry.',
    benefits: ['Fresh, clean laundry every wash', 'Suitable for machine and hand washing', 'Effective on everyday stains', 'Gentle on fabrics'],
    sku: 'DEMO-LND-001',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [{ id: 'media-demo-lnd-001', type: 'image', url: 'https://images.unsplash.com/photo-1642429947963-f04215ed5577?w=800&q=80', storageKey: null, altText: "Brite n' Shine Washing Powder 5kg", sortOrder: 0, isPrimary: true, fileName: '', mimeType: 'image/png', fileSize: 0 }],
  },
  {
    id: 'demo-brite-shine-washing-powder-10kg',
    name: "Brite n' Shine Washing Powder — 10kg",
    cat: 'laundry',
    sub: 'Value-size laundry washing powder',
    price: 0,
    was: null,
    size: '10kg',
    rating: 0,
    reviews: 0,
    badge: null,
    img: 'https://images.unsplash.com/photo-1642429947954-fe6e3aa61389?w=800&q=80',
    desc: 'Value-size washing powder for homes, guesthouses, and small businesses.',
    benefits: ['Value size for households and small businesses', 'Effective on tough stains', 'Suitable for machine and hand washing', 'Long-lasting supply'],
    sku: 'DEMO-LND-002',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [{ id: 'media-demo-lnd-002', type: 'image', url: 'https://images.unsplash.com/photo-1642429947954-fe6e3aa61389?w=800&q=80', storageKey: null, altText: "Brite n' Shine Washing Powder 10kg", sortOrder: 0, isPrimary: true, fileName: '', mimeType: 'image/png', fileSize: 0 }],
  },
  {
    id: 'demo-brite-shine-washing-powder-20kg',
    name: "Brite n' Shine Washing Powder — 20kg",
    cat: 'laundry',
    sub: 'Bulk laundry washing powder',
    price: 0,
    was: null,
    size: '20kg',
    rating: 0,
    reviews: 0,
    badge: null,
    img: 'https://images.unsplash.com/photo-1642429947963-f04215ed5577?w=800&q=80',
    desc: 'Bulk laundry washing powder for high-volume cleaning needs.',
    benefits: ['Bulk pack for high-volume use', 'Cost-effective per wash', 'Powerful stain removal', 'Suitable for commercial laundry'],
    sku: 'DEMO-LND-003',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [{ id: 'media-demo-lnd-003', type: 'image', url: 'https://images.unsplash.com/photo-1642429947963-f04215ed5577?w=800&q=80', storageKey: null, altText: "Brite n' Shine Washing Powder 20kg", sortOrder: 0, isPrimary: true, fileName: '', mimeType: 'image/png', fileSize: 0 }],
  },
  {
    id: 'demo-brite-shine-washing-powder-25kg',
    name: "Brite n' Shine Washing Powder — 25kg",
    cat: 'laundry',
    sub: 'Heavy-duty bulk washing powder',
    price: 0,
    was: null,
    size: '25kg',
    rating: 0,
    reviews: 0,
    badge: null,
    img: 'https://images.unsplash.com/photo-1642429947954-fe6e3aa61389?w=800&q=80',
    desc: 'Heavy-duty laundry powder for commercial and household use.',
    benefits: ['Heavy-duty formula for commercial use', 'Handles large laundry loads', 'Effective on overalls and workwear', 'Bulk value pricing'],
    sku: 'DEMO-LND-004',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [{ id: 'media-demo-lnd-004', type: 'image', url: 'https://images.unsplash.com/photo-1642429947954-fe6e3aa61389?w=800&q=80', storageKey: null, altText: "Brite n' Shine Washing Powder 25kg", sortOrder: 0, isPrimary: true, fileName: '', mimeType: 'image/png', fileSize: 0 }],
  },
  {
    id: 'demo-brite-shine-washing-powder-50kg',
    name: "Brite n' Shine Washing Powder — 50kg",
    cat: 'laundry',
    sub: 'Large bulk washing powder pack',
    price: 750,
    was: null,
    size: '50kg',
    rating: 0,
    reviews: 0,
    badge: null,
    img: 'https://images.unsplash.com/photo-1642429947963-f04215ed5577?w=800&q=80',
    desc: 'Large bulk washing powder pack for businesses and high-volume laundry use.',
    benefits: ['Largest pack for maximum value', 'Ideal for businesses and high-volume laundry', 'Powerful cleaning formula', 'Reduces cost per wash significantly'],
    sku: 'DEMO-LND-005',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [{ id: 'media-demo-lnd-005', type: 'image', url: 'https://images.unsplash.com/photo-1642429947963-f04215ed5577?w=800&q=80', storageKey: null, altText: "Brite n' Shine Washing Powder 50kg", sortOrder: 0, isPrimary: true, fileName: '', mimeType: 'image/png', fileSize: 0 }],
  },
];

function safeCompare(a = '', b = '') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  if (!process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'SEED_SECRET not configured.' }, { status: 500 });
  }

  if (!secret || !safeCompare(secret, process.env.SEED_SECRET)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const catOp = {
      updateOne: {
        filter: { id: LAUNDRY_CATEGORY.id },
        update: { $setOnInsert: { ...LAUNDRY_CATEGORY, createdAt: Date.now() } },
        upsert: true,
      },
    };
    const catResult = await Category.bulkWrite([catOp], { ordered: false });

    const productOps = LAUNDRY_PRODUCTS.map(p => ({
      updateOne: {
        filter: { id: p.id },
        update: { $set: { ...p, updatedAt: Date.now() } },
        upsert: true,
      },
    }));
    const productResult = await Product.bulkWrite(productOps, { ordered: false });

    return NextResponse.json({
      success: true,
      category: {
        upserted: catResult.upsertedCount,
        matched: catResult.matchedCount,
      },
      products: {
        upserted: productResult.upsertedCount,
        modified: productResult.modifiedCount,
        matched: productResult.matchedCount,
      },
    });
  } catch (err) {
    console.error('[/api/seed-laundry] Failed:', err);
    return NextResponse.json({ error: 'Seed failed', message: err.message }, { status: 500 });
  }
}
