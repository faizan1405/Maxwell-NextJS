/**
 * Check duplicate order/invoice numbers, then create sparse unique indexes.
 *
 * Usage:
 *   node scripts/ensure-order-indexes.js
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

async function findDuplicates(collection, field) {
  return collection
    .aggregate([
      { $match: { [field]: { $exists: true, $ne: null } } },
      { $group: { _id: `$${field}`, ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
}

function printDuplicates(label, duplicates) {
  if (duplicates.length === 0) {
    console.log(`${label}: no duplicates found.`);
    return;
  }

  console.log(`${label}: found ${duplicates.length} duplicate value(s).`);
  for (const duplicate of duplicates) {
    console.log(
      JSON.stringify(
        {
          value: duplicate._id,
          count: duplicate.count,
          ids: duplicate.ids.map((id) => id.toString()),
        },
        null,
        2,
      ),
    );
  }
}

async function main() {
  loadEnv();
  dns.setServers(['1.1.1.1', '8.8.8.8']);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in .env.local or environment.');
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const orders = db.collection('orders');

    const orderNumberDuplicates = await findDuplicates(orders, 'orderNumber');
    const invoiceNumberDuplicates = await findDuplicates(orders, 'invoiceNumber');

    printDuplicates('orderNumber', orderNumberDuplicates);
    printDuplicates('invoiceNumber', invoiceNumberDuplicates);

    if (orderNumberDuplicates.length > 0 || invoiceNumberDuplicates.length > 0) {
      console.log('Indexes were not created because duplicates were found.');
      process.exitCode = 2;
      return;
    }

    const orderIndex = await orders.createIndex(
      { orderNumber: 1 },
      { unique: true, sparse: true },
    );
    const invoiceIndex = await orders.createIndex(
      { invoiceNumber: 1 },
      { unique: true, sparse: true },
    );

    console.log(`Created or verified index: ${orderIndex}`);
    console.log(`Created or verified index: ${invoiceIndex}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
