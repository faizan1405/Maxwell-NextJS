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
    img: '',
    desc: 'Powerful everyday washing powder for fresh, clean laundry.',
    benefits: ['Fresh, clean laundry every wash', 'Suitable for machine and hand washing', 'Effective on everyday stains', 'Gentle on fabrics'],
    sku: 'DEMO-LND-001',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [],
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
    img: '',
    desc: 'Value-size washing powder for homes, guesthouses, and small businesses.',
    benefits: ['Value size for households and small businesses', 'Effective on tough stains', 'Suitable for machine and hand washing', 'Long-lasting supply'],
    sku: 'DEMO-LND-002',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [],
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
    img: '',
    desc: 'Bulk laundry washing powder for high-volume cleaning needs.',
    benefits: ['Bulk pack for high-volume use', 'Cost-effective per wash', 'Powerful stain removal', 'Suitable for commercial laundry'],
    sku: 'DEMO-LND-003',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [],
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
    img: '',
    desc: 'Heavy-duty laundry powder for commercial and household use.',
    benefits: ['Heavy-duty formula for commercial use', 'Handles large laundry loads', 'Effective on overalls and workwear', 'Bulk value pricing'],
    sku: 'DEMO-LND-004',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [],
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
    img: '',
    desc: 'Large bulk washing powder pack for businesses and high-volume laundry use.',
    benefits: ['Largest pack for maximum value', 'Ideal for businesses and high-volume laundry', 'Powerful cleaning formula', 'Reduces cost per wash significantly'],
    sku: 'DEMO-LND-005',
    stock: 10,
    lowStockThreshold: 5,
    status: 'active',
    variants: [],
    media: [],
  },
  {
    id: 'demo-fab-softener-5l',
    name: 'FAB Softener — Fresh & Soft 5L',
    cat: 'laundry',
    sub: 'Fabric softener with long-lasting fragrance',
    price: 0,
    was: null,
    size: '5L',
    rating: 0,
    reviews: 0,
    badge: 'Bestseller',
    img: '/assets/products/fab-softener-1.jpg',
    desc: 'Long-lasting fabric softener that leaves clothes fresh, soft, and protected. Available in blue, pink, and lavender variants.',
    benefits: [
      'Extra softness on every wash',
      'Long-lasting fresh fragrance',
      'Fabric protect formula',
      'Anti-static — safe for all washes',
    ],
    sku: 'DEMO-LND-006',
    stock: 20,
    lowStockThreshold: 5,
    status: 'active',
    purchaseMode: 'quote',
    whatsappEnabled: true,
    variants: [],
    media: [
      { id: 'fab-softener-1', type: 'image', url: '/assets/products/fab-softener-1.jpg', storageKey: null, altText: 'FAB Softener Fresh & Soft 5L blue twin pack', sortOrder: 0, isPrimary: true,  fileName: 'fab-softener-1.jpg', mimeType: 'image/jpeg', fileSize: 0, createdAt: Date.now() },
      { id: 'fab-softener-2', type: 'image', url: '/assets/products/fab-softener-2.jpg', storageKey: null, altText: 'FAB Softener pink and lavender 4-pack',     sortOrder: 1, isPrimary: false, fileName: 'fab-softener-2.jpg', mimeType: 'image/jpeg', fileSize: 0, createdAt: Date.now() },
      { id: 'fab-softener-3', type: 'image', url: '/assets/products/fab-softener-3.jpg', storageKey: null, altText: 'FAB Softener hero shot with features',    sortOrder: 2, isPrimary: false, fileName: 'fab-softener-3.jpg', mimeType: 'image/jpeg', fileSize: 0, createdAt: Date.now() },
      { id: 'fab-softener-4', type: 'image', url: '/assets/products/fab-softener-4.jpg', storageKey: null, altText: 'FAB Softener 8-pack lineup',              sortOrder: 3, isPrimary: false, fileName: 'fab-softener-4.jpg', mimeType: 'image/jpeg', fileSize: 0, createdAt: Date.now() },
    ],
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
