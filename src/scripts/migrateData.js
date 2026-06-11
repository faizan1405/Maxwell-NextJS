const fs = require('fs');
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
} catch (e) {}
const mongoose = require('mongoose');
const { readBlob } = require('../../api/_blob');

const MONGODB_URI = process.env.MONGODB_URI;

// We will use mongoose schemas loosely to insert data
const Schema = mongoose.Schema;

async function migrate() {
  if (!MONGODB_URI) {
    console.error('No MONGODB_URI found.');
    return;
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');

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
    let data = await readBlob(file.path);
    
    if (!data) {
       console.log(`No data found in blob/kv for ${file.path}. Attempting to pull seeds from ${file.seedFile}`);
       try {
         const apiFile = require('fs').readFileSync(require('path').join(__dirname, file.seedFile + '.js'), 'utf8');
         const seedMatch = apiFile.match(/const SEED_[A-Z_]+\s*=\s*(\[[\s\S]*?\]|{.*?});/m);
         if (seedMatch) {
            // Very hacky eval for the seeds:
            // Some objects might have Date functions etc, but mostly they are JSON
            // We can try to eval it
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
      
      // If it's settings, it might be an object instead of array
      if (file.name === 'Settings' && !Array.isArray(data)) {
        // Convert object to array of { key, value }
        data = Object.keys(data).map(k => ({ key: k, value: data[k] }));
      }

      if (Array.isArray(data) && data.length > 0) {
        // clear existing
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
