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
    desc: "Brite n' Shine 5kg Washing Powder is a high-performance laundry detergent formulated for reliable, everyday cleaning across both machine and hand washing. Its active stain-lifting formula cuts through dirt, grease, food marks, and general soiling while remaining gentle on fabrics and colours, leaving every load fresh, bright, and hygienically clean. The 5kg pack is ideal for households, guesthouses, salons, and small offices that want a dependable supply without committing to bulk volumes. For B2B buyers, it offers a consistent, cost-effective entry size that is easy to store, easy to dispense, and proven on day-to-day laundry — a smart starting point before scaling up to our bulk packs.",
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
    desc: "Brite n' Shine 10kg Washing Powder is a value-size laundry detergent built for homes and growing businesses that get through regular wash loads. The concentrated formula delivers powerful stain removal on everyday and stubborn marks, works in both top- and front-loading machines as well as hand washing, and rinses cleanly to leave laundry soft and fresh. The 10kg size is well suited to guesthouses, B&Bs, restaurants, salons, gyms, and small laundromats that need a longer-lasting supply at a lower cost per wash. For B2B customers, it strikes the balance between manageable pack size and bulk economy, helping reduce reorder frequency while keeping linen, uniforms, and towels consistently clean.",
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
    desc: "Brite n' Shine 20kg Washing Powder is a bulk laundry detergent engineered for high-volume cleaning where consistency and cost control matter. The heavy-duty formula tackles tough, ground-in stains, body soil, and grease across large and frequent loads, performing reliably in commercial and domestic machines as well as hand washing. The 20kg pack is ideal for hotels, lodges, hospitality groups, laundromats, schools, clinics, and cleaning contractors that process linen, towels, and uniforms in volume. For B2B buyers, bulk packaging lowers the cost per wash, cuts down on reordering, and ensures a dependable supply for operations that simply cannot run out of detergent.",
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
    desc: "Brite n' Shine 25kg Washing Powder is a heavy-duty bulk detergent designed for demanding commercial laundry and large household use. Its strong, deep-cleaning formula is built to handle heavily soiled items such as overalls, workwear, kitchen linen, and industrial uniforms, lifting oil, grime, and stubborn stains while protecting fabric quality wash after wash. The 25kg pack suits factories, workshops, mines, farms, hospitality operators, and industrial laundries that deal with large, dirty loads on a daily basis. For B2B customers, this size delivers serious bulk value, a low cost per wash, and the cleaning power needed for tough, high-frequency laundry environments.",
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
    desc: "Brite n' Shine 50kg Washing Powder is our largest bulk pack, formulated for businesses and industrial operations that run laundry at scale. The powerful, high-yield formula removes tough stains, heavy soiling, and grease across continuous, large-capacity loads while remaining effective in commercial machines and hand washing alike. The 50kg size is the go-to choice for industrial laundries, hotels and resorts, hospitals and care facilities, mines, factories, and large cleaning contractors that need maximum supply with minimal reordering. For B2B buyers, this pack offers the lowest cost per wash in the range, significant bulk savings, and the assurance of a steady, uninterrupted detergent supply for high-throughput operations.",
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
    desc: "FAB Softener Fresh & Soft 5L is a premium concentrated fabric softener that leaves laundry noticeably soft, fresh, and easy to iron, with a long-lasting fragrance that stays on linen and clothing between washes. Its fabric-protect, anti-static formula conditions fibres to reduce wear, creasing, and cling, and is safe for use across everyday fabrics in both machine and hand washing. Available in blue, pink, and lavender variants, the 5L size is ideal for households, guesthouses, hotels, salons, and laundromats that want professional-quality results and a premium finish on towels, bedding, and garments. For B2B customers, the concentrated 5L format delivers excellent value per load, dependable scent and softness, and a presentation-ready finish that elevates the guest and customer experience.",
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
