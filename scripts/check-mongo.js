const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split('\n').forEach(line => {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const eq = t.indexOf('=');
      if (eq !== -1) {
        process.env[t.slice(0, eq).trim()] = t.slice(eq+1).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found");
    return;
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const allProducts = await db.collection('products').find({}).toArray();
  const retail = allProducts.filter(p => {
    const size = String(p.size || '');
    if (size.match(/^(100ml|300ml|500ml|750ml|1L|200g|500g|1kg)$/i)) return true;
    if (p.variants) {
      return p.variants.some(v => String(v.name || '').match(/^(100ml|300ml|500ml|750ml|1L|200g|500g|1kg)$/i));
    }
    return false;
  });
  
  console.log(`Found ${retail.length} products with retail sizes out of ${allProducts.length}`);
  if (retail.length > 0) {
    console.log("Sample of 3:");
    console.log(JSON.stringify(retail.slice(0, 3).map(x => ({id: x.id, name: x.name, size: x.size, variants: x.variants})), null, 2));
  }
  await client.close();
}

run().catch(console.error);
