import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { connectToDatabase } from '../../../lib/mongoose';
import { Product, Category } from '../../../lib/models';
import demoProducts from '../../../../data/maxwell-products.json';

const demoCategories = [
  {
    id: 'car-polish',
    name: 'Car Polish',
    short: 'Polish',
    icon: 'Sparkles',
    blurb: 'Professional-grade car polish, compounds and detailing products.',
    accent: '#7C2D12',
    status: 'active',
    displayOrder: 5,
  },
  {
    id: 'car-shampoo',
    name: 'Car Shampoo',
    short: 'Shampoo',
    icon: 'Droplets',
    blurb: 'Premium car shampoos for a showroom-clean finish.',
    accent: '#1B4F72',
    status: 'active',
    displayOrder: 6,
  },
  {
    id: 'laundry',
    name: 'Laundry Products',
    short: 'Laundry',
    icon: 'Sparkles',
    blurb: 'Washing powders and laundry solutions for homes and businesses.',
    accent: '#0891B2',
    status: 'active',
    displayOrder: 7,
  },
];

function safeCompare(a = '', b = '') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeProduct(product) {
  // eslint-disable-next-line no-unused-vars
  const { createdAt: _c, updatedAt: _u, ...rest } = product;
  return {
    ...rest,
    variants: Array.isArray(product.variants) ? product.variants : [],
    media: Array.isArray(product.media) ? product.media : [],
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function hasProductChanged(existing, next) {
  const keys = Object.keys(next).filter(key => key !== 'updatedAt');

  return keys.some(key => stableStringify(existing?.[key]) !== stableStringify(next[key]));
}

export async function GET(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  if (!process.env.SEED_SECRET) {
    console.error('[/api/seed-demo] SEED_SECRET is not configured.');
    return NextResponse.json({ error: 'Seed endpoint is not configured.' }, { status: 500 });
  }

  if (!secret || !safeCompare(secret, process.env.SEED_SECRET)) {
    console.warn('[/api/seed-demo] Forbidden seed attempt.');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    if (!Array.isArray(demoProducts) || demoProducts.length === 0) {
      return NextResponse.json({ error: 'No demo products loaded from JSON', count: 0 });
    }

    const seedProducts = demoProducts.map(normalizeProduct);
    const ids = seedProducts.map(product => product.id).filter(Boolean);
    const existingProducts = await Product.find({ id: { $in: ids } }).lean();
    const existingById = new Map(existingProducts.map(product => [product.id, product]));
    let insertedProducts = 0;
    let updatedProducts = 0;
    let skippedProducts = 0;

    const ops = seedProducts.reduce((acc, product) => {
      if (!product.id) {
        skippedProducts++;
        return acc;
      }

      const existing = existingById.get(product.id);
      if (!existing) {
        insertedProducts++;
      } else if (hasProductChanged(existing, product)) {
        updatedProducts++;
      } else {
        skippedProducts++;
        return acc;
      }

      acc.push({
        updateOne: {
          filter: { id: product.id },
          update: {
            $set: product,
          },
          upsert: true,
        },
      });

      return acc;
    }, []);

    const result = ops.length > 0
      ? await Product.bulkWrite(ops, { ordered: false })
      : { upsertedCount: 0, matchedCount: 0, modifiedCount: 0 };
    const total = await Product.countDocuments();

    const categoryOps = demoCategories.map(cat => ({
      updateOne: {
        filter: { id: cat.id },
        update: { $setOnInsert: { ...cat, createdAt: Date.now() } },
        upsert: true,
      },
    }));
    const categoryResult = await Category.bulkWrite(categoryOps, { ordered: false });

    console.log('[/api/seed-demo] Seed complete.', {
      processed: seedProducts.length,
      insertedProducts,
      updatedProducts,
      skippedProducts,
      totalProductsInDB: total,
      categoriesUpserted: categoryResult.upsertedCount,
    });

    return NextResponse.json({
      success: true,
      totalProductsProcessed: seedProducts.length,
      insertedProducts,
      updatedProducts,
      skippedProducts,
      totalProductsInDB: total,
      bulkWrite: {
        upsertedCount: result.upsertedCount,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      categoriesUpserted: categoryResult.upsertedCount,
    });
  } catch (err) {
    console.error('[/api/seed-demo] Seed failed:', err);
    return NextResponse.json({
      error: 'Seed failed',
      message: err.message,
    }, { status: 500 });
  }
}
