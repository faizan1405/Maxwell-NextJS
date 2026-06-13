const fs = require('fs');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*"?(.*?)"?\s*$/);
  if (match) process.env[match[1]] = match[2];
});

const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;

  const categories = await db.collection('categories').find({}).toArray();
  const catIds = new Set(categories.map(c => c.id));
  const products = await db.collection('products').find({}).toArray();
  const orders = await db.collection('orders').find({}).toArray();

  // 1. Products with invalid/missing category
  const orphanProducts = products.filter(p => !catIds.has(p.cat));
  console.log('[1] Products with invalid/missing cat:', orphanProducts.length);
  if (orphanProducts.length) {
    orphanProducts.slice(0, 5).forEach(p => console.log('    id:', p.id, '| cat:', p.cat));
  }

  // 2. Active-state orders where stockDeducted is false (missed deductions)
  const DEDUCTED_STATES = ['confirmed', 'processing', 'shipped', 'delivered'];
  const missedDeductions = orders.filter(o =>
    DEDUCTED_STATES.includes(o.status) && !o.stockDeducted
  );
  console.log('[2] Active-state orders with stockDeducted=false:', missedDeductions.length);
  if (missedDeductions.length) {
    missedDeductions.slice(0, 5).forEach(o =>
      console.log('    id:', o.id, '| status:', o.status, '| items:', (o.items || []).length)
    );
  }

  // 3. Duplicate consecutive payment status history entries
  let dupCount = 0;
  orders.forEach(o => {
    const hist = o.paymentStatusHistory || [];
    for (let i = 1; i < hist.length; i++) {
      if (hist[i].newStatus === hist[i - 1].newStatus &&
          hist[i].previousStatus === hist[i - 1].previousStatus) {
        dupCount++;
      }
    }
  });
  console.log('[3] Duplicate consecutive payment history entries across all orders:', dupCount);

  // 4. StockHistory entries created in last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentStock = await db.collection('stockhistories').countDocuments({ createdAt: { $gte: cutoff } });
  console.log('[4] StockHistory entries (last 7 days):', recentStock);

  // 5. EFT awaiting approval
  const eftPending = orders.filter(o => {
    const method = (o.paymentMethod || (o.payment && o.payment.method) || '').toUpperCase();
    return method === 'EFT' && (
      o.paymentStatus === 'Proof of Payment Submitted' ||
      o.paymentStatus === 'Payment Verification Required'
    );
  });
  const eftTotal = eftPending.reduce((s, o) => s + (o.total || 0), 0);
  console.log('[5] EFT awaiting approval:', eftPending.length, 'orders | value: R' + eftTotal.toFixed(2));

  // 6. Products missing required img field
  const noImg = products.filter(p => !p.img);
  console.log('[6] Products missing img:', noImg.length);
  if (noImg.length) noImg.slice(0, 3).forEach(p => console.log('    id:', p.id));

  // 7. Duplicate SKUs
  const skuMap = {};
  products.forEach(p => { if (p.sku) skuMap[p.sku] = (skuMap[p.sku] || 0) + 1; });
  const dupSkus = Object.entries(skuMap).filter(([, c]) => c > 1);
  console.log('[7] Duplicate SKUs:', dupSkus.length);
  if (dupSkus.length) dupSkus.slice(0, 5).forEach(([sku, c]) => console.log('    sku:', sku, 'x' + c));

  // 8. Orders with items referencing non-existent product IDs
  const productIds = new Set(products.map(p => p.id));
  let ghostItemCount = 0;
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      if (item.productId && !productIds.has(item.productId)) ghostItemCount++;
    });
  });
  console.log('[8] Order line items referencing deleted products:', ghostItemCount);

  // 9. Products with stock < 0
  const negStock = products.filter(p => p.stock < 0);
  console.log('[9] Products with negative stock:', negStock.length);
  if (negStock.length) negStock.slice(0, 5).forEach(p => console.log('    id:', p.id, '| stock:', p.stock));

  // Summary
  console.log('\nDB summary — categories:', categories.length, '| products:', products.length, '| orders:', orders.length);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
