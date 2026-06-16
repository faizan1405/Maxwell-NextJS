/**
 * Bulk-switch all products to purchaseMode: "quote".
 * Preserves prices (price field untouched).
 *
 * Usage:
 *   node scripts/bulk-set-quote-mode.js          # dry run
 *   node scripts/bulk-set-quote-mode.js --apply  # perform update
 */

const { MongoClient } = require('mongodb');
const dns = require('dns');
const { readFileSync } = require('fs');
const { join } = require('path');

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
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? value;
    }
  } catch {
    // No local env file; rely on the process environment.
  }
}

async function main() {
  loadEnv();
  dns.setServers(['1.1.1.1', '8.8.8.8']);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in .env.local or environment.');
  }

  const apply = process.argv.includes('--apply');
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const products = db.collection('products');

    const total = await products.countDocuments({});
    const quoteBefore = await products.countDocuments({ purchaseMode: 'quote' });
    const notQuoteBefore = await products.countDocuments({ purchaseMode: { $ne: 'quote' } });

    const sample = await products
      .find({ purchaseMode: { $ne: 'quote' } }, { projection: { id: 1, name: 1, price: 1, purchaseMode: 1 } })
      .limit(5)
      .toArray();

    console.log(JSON.stringify({
      mode: apply ? 'APPLY' : 'DRY_RUN',
      total,
      quoteBefore,
      notQuoteBefore,
      sample,
    }, null, 2));

    if (!apply) {
      console.log('Dry run. Re-run with --apply to perform the update.');
      return;
    }

    const result = await products.updateMany(
      { purchaseMode: { $ne: 'quote' } },
      { $set: { purchaseMode: 'quote', whatsappEnabled: true, updatedAt: Date.now() } },
    );

    const quoteAfter = await products.countDocuments({ purchaseMode: 'quote' });
    const notQuoteAfter = await products.countDocuments({ purchaseMode: { $ne: 'quote' } });
    const zeroPrice = await products.countDocuments({ $or: [{ price: { $exists: false } }, { price: null }, { price: 0 }] });

    console.log(JSON.stringify({
      matched: result.matchedCount,
      modified: result.modifiedCount,
      total,
      quoteAfter,
      notQuoteAfter,
      zeroPriceCount: zeroPrice,
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
