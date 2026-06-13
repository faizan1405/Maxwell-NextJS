/**
 * One-off script: reset all product and variant stocks to 10.
 * Usage: node src/scripts/resetStock.js
 */

const fs = require('fs');

// Load .env.local outside of the Next.js runtime
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
} catch (e) {
  // rely on shell environment
}

const dns = require('dns');
const mongoose = require('mongoose');

// Node.js c-ares DNS is pointing at 127.0.0.1 (leftover from Docker/VPN) with
// nothing listening there, so SRV lookups fail with ECONNREFUSED. Override to
// public resolvers so mongodb+srv:// SRV lookup succeeds.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Add it to .env.local or your shell environment.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;
  const col = db.collection('products');

  // Products WITHOUT variants: set stock = 10
  const noVariantsResult = await col.updateMany(
    { $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] },
    { $set: { stock: 10 } }
  );

  // Products WITH variants: map each variant.stock = 10, parent stock = 10 × count
  const withVariantsResult = await col.updateMany(
    { 'variants.0': { $exists: true } },
    [
      {
        $set: {
          variants: {
            $map: {
              input: '$variants',
              as: 'v',
              in: { $mergeObjects: ['$$v', { stock: 10 }] },
            },
          },
          stock: { $multiply: [{ $size: '$variants' }, 10] },
        },
      },
    ]
  );

  const totalVariants = await col.aggregate([
    { $match: { 'variants.0': { $exists: true } } },
    { $project: { count: { $size: '$variants' } } },
    { $group: { _id: null, total: { $sum: '$count' } } },
  ]).toArray();

  const variantCount = totalVariants[0]?.total ?? 0;

  console.log('--- Stock Reset Complete ---');
  console.log(`Products without variants updated: ${noVariantsResult.modifiedCount}`);
  console.log(`Products with variants updated:    ${withVariantsResult.modifiedCount}`);
  console.log(`Total variation slots updated:     ${variantCount}`);
  console.log(`Total products updated:            ${noVariantsResult.modifiedCount + withVariantsResult.modifiedCount}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
