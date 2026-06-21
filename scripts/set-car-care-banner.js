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
  
  const result = await db.collection('categories').updateOne(
    { id: 'car' },
    { $set: { mobileBannerImage: '/assets/car-care-mobile-banner.jpg' } }
  );
  
  console.log(`Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s).`);
  await client.close();
}

run().catch(console.error);
