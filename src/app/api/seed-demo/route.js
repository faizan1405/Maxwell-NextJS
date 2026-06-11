import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import Product from '../../../models/Product';
import demoProducts from '../../../../data/maxwell-products.json';

export async function GET(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (secret !== 'seed-now-2026') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    if (!Array.isArray(demoProducts) || demoProducts.length === 0) {
      return NextResponse.json({ error: 'No demo products loaded from JSON', count: 0 });
    }

    const ops = demoProducts.map(p => ({
      updateOne: {
        filter: { id: p.id },
        update: {
          $setOnInsert: {
            ...p,
            variants: Array.isArray(p.variants) ? p.variants : [],
            media: Array.isArray(p.media) ? p.media : [],
          },
        },
        upsert: true,
      },
    }));

    const result = await Product.bulkWrite(ops, { ordered: false });
    const total = await Product.countDocuments();

    return NextResponse.json({
      success: true,
      jsonCount: demoProducts.length,
      upsertedCount: result.upsertedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      totalProductsInDB: total,
    });
  } catch (err) {
    return NextResponse.json({
      error: err.message,
      stack: err.stack,
    }, { status: 500 });
  }
}
