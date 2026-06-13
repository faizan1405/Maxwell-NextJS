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

  const products = await db.collection('products').find({}).toArray();
  const orders = await db.collection('orders').find({}).toArray();
  const productIds = new Set(products.map(p => p.id));
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  // Issue 2: deep dive into the 2 delivered orders with stockDeducted=false
  const DEDUCTED_STATES = ['confirmed', 'processing', 'shipped', 'delivered'];
  const missed = orders.filter(o => DEDUCTED_STATES.includes(o.status) && !o.stockDeducted);
  console.log('=== ISSUE 2: Delivered orders with stockDeducted=false ===');
  missed.forEach(o => {
    console.log('\nOrder:', o.id, '| status:', o.status, '| paymentStatus:', o.paymentStatus);
    (o.items || []).forEach(item => {
      const prod = productMap[item.productId];
      console.log(
        '  item:', item.productId,
        '| variant:', item.variantName || 'none',
        '| qty:', item.qty || item.quantity,
        '| product exists:', !!prod,
        '| current stock:', prod ? prod.stock : 'N/A'
      );
    });
  });

  // Issue 8: deep dive into ghost product references
  console.log('\n=== ISSUE 8: Order items referencing deleted products ===');
  orders.forEach(o => {
    const ghosts = (o.items || []).filter(item => item.productId && !productIds.has(item.productId));
    if (ghosts.length) {
      console.log('\nOrder:', o.id, '| status:', o.status);
      ghosts.forEach(item =>
        console.log('  ghost productId:', item.productId, '| name:', item.name || item.productName, '| qty:', item.qty || item.quantity)
      );
    }
  });

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
