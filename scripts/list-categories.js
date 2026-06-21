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
  if (!process.env.MONGODB_URI) return;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const categories = await db.collection('categories').find({}).toArray();
  console.log("Categories:");
  categories.forEach(c => console.log(c.id, "-", c.name));
  await client.close();
}

run().catch(console.error);
