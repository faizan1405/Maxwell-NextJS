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
  } catch {}
}

async function main() {
  loadEnv();
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const products = db.collection('products');

    const total = await products.countDocuments({});
    const quote = await products.countDocuments({ purchaseMode: 'quote' });
    const cart = await products.countDocuments({ purchaseMode: 'cart' });
    const other = await products.countDocuments({ purchaseMode: { $nin: ['quote', 'cart'] } });
    const withPrice = await products.countDocuments({ price: { $gt: 0 } });
    const noPrice = await products.countDocuments({ $or: [{ price: { $exists: false } }, { price: null }, { price: { $lte: 0 } }] });

    const samples = await products
      .find({}, { projection: { id: 1, name: 1, price: 1, purchaseMode: 1 } })
      .sort({ price: -1 })
      .limit(10)
      .toArray();

    const zeroPriceSample = await products
      .find({ $or: [{ price: { $exists: false } }, { price: null }, { price: { $lte: 0 } }] }, { projection: { id: 1, name: 1, price: 1, purchaseMode: 1 } })
      .limit(5)
      .toArray();

    console.log(JSON.stringify({ total, quote, cart, other, withPrice, noPrice, topPriceSamples: samples, zeroPriceSample }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
