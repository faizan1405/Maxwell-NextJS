/**
 * Idempotent script to create safe MongoDB indexes for Maxwell-NextJS admin performance.
 *
 * Usage:
 *   node scripts/create-indexes.js
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

async function ensureIndexes(db, collectionName, indexSpecs) {
  const collection = db.collection(collectionName);
  let existingIndexes = [];
  try {
    existingIndexes = await collection.listIndexes().toArray();
  } catch (err) {
    console.log(`Creating collection '${collectionName}' since it does not exist...`);
    // Collection might not exist yet; listIndexes fails in that case on some servers.
  }

  const existingMap = new Map();
  for (const idx of existingIndexes) {
    // Stringify index keys for easy comparison
    const keyStr = JSON.stringify(idx.key);
    existingMap.set(keyStr, idx.name);
  }

  console.log(`\nChecking indexes for collection: '${collectionName}'`);
  for (const spec of indexSpecs) {
    const keyStr = JSON.stringify(spec.key);
    const options = spec.options || {};
    
    if (existingMap.has(keyStr)) {
      console.log(`  - Index ${keyStr} already exists as '${existingMap.get(keyStr)}' (Skipped)`);
    } else {
      console.log(`  - Index ${keyStr} is missing. Creating...`);
      try {
        const name = await collection.createIndex(spec.key, options);
        console.log(`    ✓ Created index: '${name}'`);
      } catch (err) {
        console.error(`    ✗ Error creating index ${keyStr}:`, err.message);
      }
    }
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
    console.log('Connected to MongoDB database.');

    // Define index configurations for each collection
    const specs = {
      orders: [
        { key: { createdAt: -1 } },
        { key: { status: 1 } },
        { key: { paymentStatus: 1 } },
        { key: { paymentMethod: 1 } },
        { key: { 'customer.phone': 1 } }
      ],
      customers: [
        { key: { phone: 1 } },
        { key: { createdAt: -1 } }
      ],
      products: [
        { key: { name: 1 } },
        { key: { createdAt: -1 } }
      ],
      reviews: [
        { key: { status: 1 } },
        { key: { createdAt: -1 } }
      ],
      abandonedcarts: [
        { key: { guestId: 1 }, options: { sparse: true } },
        { key: { customerId: 1 }, options: { sparse: true } },
        { key: { updatedAt: -1 } },
        { key: { createdAt: -1 } }
      ]
    };

    for (const [col, colSpecs] of Object.entries(specs)) {
      await ensureIndexes(db, col, colSpecs);
    }

    console.log('\nAll index checks completed successfully.');
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
