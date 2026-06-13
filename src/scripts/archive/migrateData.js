/**
 * Data Migration Script — src/scripts/migrateData.js
 *
 * PURPOSE: One-off migration utility for moving data from a legacy Blob/KV store
 * into MongoDB. This script is NOT part of the normal application runtime.
 *
 * Usage: node src/scripts/migrateData.js
 *
 * IMPORTANT: This script uses `eval()` to parse seed constants extracted from
 * API route files as a fallback. This is intentional and safe here because it
 * runs only as a local admin CLI tool, never in the web server context.
 *
 * CAUTION: This script calls `deleteMany({})` on each collection before
 * inserting, which will wipe existing data. Run it only on a fresh database
 * or after taking a backup.
 *
 * SAFETY: Archived maintenance script. Requires
 * ALLOW_DESTRUCTIVE_MAINTENANCE=migrate-data before it can run.
 */

if (process.env.ALLOW_DESTRUCTIVE_MAINTENANCE !== 'migrate-data') {
  console.error('Refusing to run. Set ALLOW_DESTRUCTIVE_MAINTENANCE=migrate-data for this archived maintenance script.');
  process.exit(1);
}

const fs = require('fs');

// Parse .env.local manually — this script runs outside the Next.js runtime,
// so environment variables must be loaded from the file directly.
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?  \s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
} catch (e) {
  // If .env.local is missing, rely on environment variables already set in the shell
}

const mongoose = require('mongoose');

// readBlob: reads data from the legacy Blob/KV storage system.
// This import path only works in the legacy project structure.
const { readBlob } = require('../../api/_blob');

const MONGODB_URI = process.env.MONGODB_URI;

const Schema = mongoose.Schema;

/**
 * Main migration function. Iterates over each data file definition and:
 *   1. Attempts to read the data from the legacy blob/KV store.
 *   2. If blob data is missing, falls back to extracting SEED_ constants from
 *      the API route files using a regex + eval (hacky but functional for migration).
 *   3. Clears the target MongoDB collection and inserts the new data.
 *
 * Settings documents are handled separately since they are stored as a single
 * object rather than an array, and need to be converted to { key, value } format.
 */
async function migrate() {
  if (!MONGODB_URI) {
    console.error('No MONGODB_URI found.');
    return;
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');

  // Each entry maps a blob/KV path to its MongoDB collection name and the
  // legacy API file that may contain SEED_ constant fallback data.
  const files = [
    { path: 'data/maxwell-products.json', name: 'Product', seedFile: '../../api/products' },
    { path: 'data/maxwell-orders.json', name: 'Order', seedFile: '../../api/orders' },
    { path: 'data/maxwell-customers.json', name: 'Customer', seedFile: '../../api/customers' },
    { path: 'data/maxwell-settings.json', name: 'Settings', seedFile: '../../api/settings' },
    { path: 'data/maxwell-coupons.json', name: 'Coupon', seedFile: '../../api/coupons' },
    { path: 'data/maxwell-reviews.json', name: 'Review', seedFile: '../../api/reviews' },
    { path: 'data/maxwell-faqs.json', name: 'Faq', seedFile: '../../api/faqs' },
    { path: 'data/maxwell-categories.json', name: 'Category', seedFile: '../../api/_categories' },
    { path: 'data/maxwell-shipping.json', name: 'ShippingRate', seedFile: '../../api/_shipping' },
    { path: 'data/maxwell-carts.json', name: 'AbandonedCart', seedFile: '../../api/carts' },
  ];

  for (const file of files) {
    console.log(`\nMigrating ${file.name}...`);

    // Step 1: Try to read data from blob/KV store
    let data = await readBlob(file.path);
    
    if (!data) {
      // Step 2: Blob data missing — attempt to extract a SEED_ constant from the
      // legacy API route file using regex. The eval() is intentional here and limited
      // to a local admin tool context with known, trusted source files.
      console.log(`No data found in blob/kv for ${file.path}. Attempting to pull seeds from ${file.seedFile}`);
      try {
        const apiFile = require('fs').readFileSync(require('path').join(__dirname, file.seedFile + '.js'), 'utf8');
        const seedMatch = apiFile.match(/const SEED_[A-Z_]+\s*=\s*(\[[\s\S]*?\]|{.*?});/m);
        if (seedMatch) {
          // NOTE: eval() is used here as a deliberate shortcut for the migration tool.
          // Some seed objects may contain Date() calls or other JS; plain JSON.parse()
          // would fail on those. This is acceptable for a one-time admin script.
          data = eval(seedMatch[1]);
        }
      } catch (err) {
        console.log(`Failed to parse seeds for ${file.name}: ${err.message}`);
      }
    }

    if (data) {
      const collectionName = file.name + 's';
      const db = mongoose.connection.db;
      const coll = db.collection(collectionName);
      
      // Settings is stored as a single flat object in the legacy system.
      // Convert it to the expected { key, value } array format for MongoDB.
      if (file.name === 'Settings' && !Array.isArray(data)) {
        data = Object.keys(data).map(k => ({ key: k, value: data[k] }));
      }

      if (Array.isArray(data) && data.length > 0) {
        // Full replacement: clear existing documents then insert migrated data
        await coll.deleteMany({});
        await coll.insertMany(data);
        console.log(`✅ Inserted ${data.length} ${file.name} records.`);
      } else {
        console.log(`⚠️ Data was empty or not an array for ${file.name}.`);
      }
    } else {
      console.log(`❌ No data found for ${file.name}`);
    }
  }

  console.log('\nMigration Complete.');
  await mongoose.disconnect();
}

migrate().catch(console.error);
