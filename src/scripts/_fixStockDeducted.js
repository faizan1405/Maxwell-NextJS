const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*"?(.*?)"?\s*$/);
  if (match) process.env[match[1]] = match[2];
});

const mongoose = require('mongoose');

const TARGET_IDS = ['ORD-1781212344054', 'ORD-1781218722619'];
const STOCK_WATCH = ['demo-all-purpose-cleaner', 'demo-floor-cleaner-concentrate'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;
  const orders = db.collection('orders');
  const products = db.collection('products');

  // ── Step 1: snapshot product stocks before touching anything ──
  const stockBefore = await products
    .find({ id: { $in: STOCK_WATCH } })
    .project({ id: 1, stock: 1, _id: 0 })
    .toArray();
  console.log('Stock BEFORE (must not change):');
  stockBefore.forEach(p => console.log('  ', p.id, '→', p.stock));

  // ── Step 2: export the two orders to a backup file ──
  const affected = await orders.find({ id: { $in: TARGET_IDS } }).toArray();
  if (affected.length !== 2) {
    console.error('Expected 2 orders, found', affected.length, '— aborting.');
    process.exit(1);
  }

  const backupPath = path.join(__dirname, '_backup_stockDeducted_orders.json');
  fs.writeFileSync(backupPath, JSON.stringify(affected, null, 2), 'utf8');
  console.log('\nBackup written to:', backupPath);
  affected.forEach(o => {
    console.log('  Backed up:', o.id, '| status:', o.status,
      '| stockDeducted (before):', o.stockDeducted ?? false);
  });

  // ── Step 3: verify neither order has stockDeducted=true already ──
  const alreadySet = affected.filter(o => o.stockDeducted === true);
  if (alreadySet.length) {
    console.error('\nUnexpected: some orders already have stockDeducted=true:', alreadySet.map(o => o.id));
    process.exit(1);
  }

  // ── Step 4: apply the fix — touch ONLY stockDeducted ──
  const result = await orders.updateMany(
    { id: { $in: TARGET_IDS } },
    { $set: { stockDeducted: true } }
  );
  console.log('\nUpdate result — matchedCount:', result.matchedCount, '| modifiedCount:', result.modifiedCount);

  // ── Step 5: confirm final values ──
  const updated = await orders
    .find({ id: { $in: TARGET_IDS } })
    .project({ id: 1, status: 1, stockDeducted: 1, _id: 0 })
    .toArray();
  console.log('\nFinal order state:');
  updated.forEach(o =>
    console.log('  ', o.id, '| status:', o.status, '| stockDeducted:', o.stockDeducted)
  );

  // ── Step 6: confirm product stocks are unchanged ──
  const stockAfter = await products
    .find({ id: { $in: STOCK_WATCH } })
    .project({ id: 1, stock: 1, _id: 0 })
    .toArray();
  console.log('\nStock AFTER (must match before):');
  let stockDrift = false;
  stockAfter.forEach(p => {
    const before = stockBefore.find(b => b.id === p.id);
    const changed = before && before.stock !== p.stock;
    if (changed) stockDrift = true;
    console.log('  ', p.id, '→', p.stock, changed ? '⚠ CHANGED' : '✓ unchanged');
  });

  if (stockDrift) {
    console.error('\nERROR: stock quantities changed — investigate immediately.');
    process.exit(1);
  } else {
    console.log('\nAll checks passed. Stock quantities untouched.');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
