/**
 * Seed demo products into MongoDB.
 * Usage: node scripts/seed-products.mjs
 * Reads MONGODB_URI from .env.local automatically.
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Parse .env.local manually — no dotenv dependency needed
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
    // .env.local not found — rely on environment variables already set
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in .env.local or environment.');
  process.exit(1);
}

const products = JSON.parse(readFileSync(join(ROOT, 'data', 'maxwell-products.json'), 'utf8'));

const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const db = client.db();
  const col = db.collection('products');

  let inserted = 0;
  let skipped = 0;

  for (const product of products) {
    const existing = await col.findOne({ id: product.id });
    if (existing) {
      skipped++;
    } else {
      await col.insertOne({ ...product, createdAt: new Date(), updatedAt: new Date() });
      inserted++;
    }
  }

  console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
} finally {
  await client.close();
}
