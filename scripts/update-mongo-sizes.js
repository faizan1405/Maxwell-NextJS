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

const sizeMappings = {
  '100ml': '5L',
  '300ml': '5L',
  '500ml': '5L',
  '750ml': '5L',
  '1L': '25L',
  '200g': '5kg',
  '500g': '5kg',
  '1kg': '25kg'
};

const regexReplacements = [
  { regex: /bottle/gi, replace: 'drum' },
  { regex: /trigger spray/gi, replace: 'bulk drum' },
  { regex: /bottles/gi, replace: 'drums' },
  { regex: /premium drum design/gi, replace: 'industrial drum design' },
  { regex: /retail stores/gi, replace: 'manufacturing plants' },
  { regex: /retail/gi, replace: 'industrial' },
  { regex: /consumer/gi, replace: 'commercial' }
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found");
    return;
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const productsCol = db.collection('products');
  
  const allProducts = await productsCol.find({}).toArray();
  
  let updatedCount = 0;
  for (const p of allProducts) {
    const updateOps = { $set: {} };
    let changed = false;

    // 1. Root Size
    const oldSize = p.size;
    if (sizeMappings[oldSize]) {
      updateOps.$set.size = sizeMappings[oldSize];
      changed = true;
    }

    // 2. Variants (only size name)
    if (p.variants && p.variants.length > 0) {
      const newVariants = p.variants.map(v => {
        if (sizeMappings[v.name]) {
          return { ...v, name: sizeMappings[v.name] };
        }
        return v;
      });
      
      // Deduplicate variants by name
      const uniqueVariants = [];
      const seen = new Set();
      for (const v of newVariants) {
        if (!seen.has(v.name)) {
          seen.add(v.name);
          uniqueVariants.push(v);
        }
      }

      if (JSON.stringify(uniqueVariants) !== JSON.stringify(p.variants)) {
        updateOps.$set.variants = uniqueVariants;
        changed = true;
      }
    }

    // 3. Descriptions
    if (p.desc) {
      let newDesc = p.desc;
      regexReplacements.forEach(r => {
        newDesc = newDesc.replace(r.regex, r.replace);
      });
      if (newDesc !== p.desc) {
        updateOps.$set.desc = newDesc;
        changed = true;
      }
    }

    // 4. Benefits
    if (p.benefits && p.benefits.length > 0) {
      const newBenefits = p.benefits.map(b => {
        let text = b;
        regexReplacements.forEach(r => {
          text = text.replace(r.regex, r.replace);
        });
        return text;
      });
      if (JSON.stringify(newBenefits) !== JSON.stringify(p.benefits)) {
        updateOps.$set.benefits = newBenefits;
        changed = true;
      }
    }

    if (changed) {
      await productsCol.updateOne({ _id: p._id }, updateOps);
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} products in MongoDB`);
  await client.close();
}

run().catch(console.error);
