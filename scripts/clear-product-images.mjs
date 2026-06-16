/**
 * Clear ALL product image fields from MongoDB.
 *
 * Reason: prior product images were not owned by the client. We remove
 * every image URL/reference from the products collection. Nothing else
 * about the products is modified.
 *
 * Fields cleared per product:
 *   - img            -> ''
 *   - secondaryImg   -> ''
 *   - images         -> []
 *   - media          -> []
 *
 * Untouched: name, desc, price, cat, sub, sku, stock, variants,
 *            purchaseMode, slug, status, whatsapp*, video, etc.
 *
 * Usage:
 *   ALLOW_MAINTENANCE_SCRIPT=clear-product-images node scripts/clear-product-images.mjs
 *   ALLOW_MAINTENANCE_SCRIPT=clear-product-images node scripts/clear-product-images.mjs --dry
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? val;
    }
  } catch {
    /* rely on already-set env */
  }
}

loadEnv();

if (process.env.ALLOW_MAINTENANCE_SCRIPT !== 'clear-product-images') {
  console.error('Refusing to run. Set ALLOW_MAINTENANCE_SCRIPT=clear-product-images.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found.');
  process.exit(1);
}

const DRY = process.argv.includes('--dry');
const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const db = client.db();
  const col = db.collection('products');

  const total = await col.countDocuments();
  const withAnyImage = await col.countDocuments({
    $or: [
      { img: { $exists: true, $nin: ['', null] } },
      { secondaryImg: { $exists: true, $nin: ['', null] } },
      { images: { $exists: true, $not: { $size: 0 } } },
      { media: { $exists: true, $not: { $size: 0 } } },
    ],
  });

  console.log(`Total products: ${total}`);
  console.log(`Products with image data: ${withAnyImage}`);

  if (DRY) {
    console.log('DRY RUN — no changes written.');
    const sample = await col.find({}, { projection: { id: 1, name: 1, img: 1, images: 1, media: 1 } }).limit(3).toArray();
    console.log('Sample:', JSON.stringify(sample, null, 2));
  } else {
    const res = await col.updateMany(
      {},
      {
        $set: {
          img: '',
          secondaryImg: '',
          images: [],
          media: [],
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Matched: ${res.matchedCount}, Modified: ${res.modifiedCount}`);

    const remaining = await col.countDocuments({
      $or: [
        { img: { $nin: ['', null] } },
        { secondaryImg: { $nin: ['', null] } },
        { images: { $not: { $size: 0 } } },
        { media: { $not: { $size: 0 } } },
      ],
    });
    console.log(`Products still holding image data after update: ${remaining}`);
  }
} finally {
  await client.close();
}
