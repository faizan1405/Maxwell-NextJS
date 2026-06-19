/**
 * Generate longer, professional, B2B-focused product descriptions for every
 * product in the live MongoDB `products` collection.
 *
 * SAFETY
 *   - Only ever writes the `desc` field (and `benefits` ONLY when it is empty)
 *     plus a fresh `updatedAt` timestamp. Nothing else is touched.
 *   - Never changes: name, img/media, cat, price, was, stock, lowStockThreshold,
 *     status, purchaseMode, variants, sku, whatsapp settings, etc.
 *   - Never deletes products.
 *   - Always exports a full backup of every product BEFORE applying anything.
 *   - Dry-run by default. Writes a preview file so you can review proposed
 *     descriptions before committing.
 *
 * USAGE
 *   node scripts/update-product-descriptions.js            # dry run + backup + preview
 *   node scripts/update-product-descriptions.js --apply    # backup + apply to MongoDB
 *   node scripts/update-product-descriptions.js --apply --force-all   # rewrite even long descs
 *
 * OUTPUT
 *   scripts/backups/products-backup-<timestamp>.json   full pre-update snapshot
 *   scripts/backups/preview-<timestamp>.json           id / old / new for every change
 */

const { MongoClient } = require('mongodb');
const dns = require('dns');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const BACKUP_DIR = join(__dirname, 'backups');

// A description shorter than this is considered "too short / weak" and will be
// regenerated. Already-long descriptions are kept unless --force-all is passed.
const MIN_GOOD_LENGTH = 220;

function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? value;
    }
  } catch {
    // No local env file; rely on the process environment.
  }
}

// ── Category profiles: who buys it, where it is used, how it is framed ──────
const CATEGORY_PROFILES = {
  household: {
    label: 'household cleaning',
    intro: 'a dependable everyday cleaning solution formulated for consistent, professional results across the home and busy commercial spaces',
    uses: 'homes, offices, guesthouses, Airbnbs, schools, restaurants, salons and cleaning companies',
    operators: 'households, property managers, hospitality operators and contract cleaners',
  },
  industrial: {
    label: 'industrial cleaning',
    intro: 'a heavy-duty, industrial-strength formula built for demanding cleaning and maintenance tasks where ordinary products fall short',
    uses: 'workshops, factories, warehouses, garages, manufacturing plants, mines and fleet maintenance facilities',
    operators: 'maintenance teams, facilities managers, industrial operators and cleaning contractors',
  },
  car: {
    label: 'car care',
    intro: 'a quality vehicle-care product developed to deliver a clean, well-presented finish on cars, bakkies and commercial vehicles',
    uses: 'car washes, valet and detailing businesses, dealerships, panel shops, fleet operators and home car-care enthusiasts',
    operators: 'car wash operators, detailers, dealerships and fleet owners',
  },
  'car-exterior': {
    label: 'exterior car care',
    intro: 'an exterior vehicle-care product designed to lift dirt, road film and grime while protecting paintwork and trim',
    uses: 'car washes, valet and detailing businesses, dealerships, fleet operators and home car-care enthusiasts',
    operators: 'car wash operators, detailers, dealerships and fleet owners',
  },
  'car-polish': {
    label: 'car polish & finishing',
    intro: 'a professional polish and finishing product formulated to restore shine, enhance gloss and protect vehicle surfaces',
    uses: 'detailing studios, valet services, dealerships, panel shops and discerning home users',
    operators: 'detailers, valet services and dealerships',
  },
  'car-shampoo': {
    label: 'car shampoo',
    intro: 'a rich, high-foam car shampoo that cuts through road grime and traffic film for a streak-free, well-presented finish',
    uses: 'car washes, valet and detailing businesses, dealerships, fleet operators and home users',
    operators: 'car wash operators, detailers and fleet owners',
  },
  sanitiser: {
    label: 'hygiene & sanitising',
    intro: 'an effective hygiene and sanitising product that supports clean, safe environments and good hand- and surface-hygiene practice',
    uses: 'offices, schools, clinics, restaurants, gyms, retail stores and public facilities',
    operators: 'businesses, schools, healthcare facilities and hygiene-conscious operators',
  },
  laundry: {
    label: 'laundry care',
    intro: 'a reliable laundry-care product that delivers fresh, clean, well-presented results load after load',
    uses: 'homes, guesthouses, hotels, B&Bs, salons, gyms, laundromats and commercial laundries',
    operators: 'households, hospitality operators and commercial laundries',
  },
};

const DEFAULT_PROFILE = {
  label: 'cleaning',
  intro: 'a quality cleaning product formulated for consistent, professional results',
  uses: 'homes, offices, guesthouses, schools, restaurants, facilities and cleaning companies',
  operators: 'households, businesses and cleaning contractors',
};

// Parse a size string ("5L", "20kg", "750ml") into litres/kg to judge bulk.
function isBulkSize(size) {
  if (!size) return false;
  const m = String(size).toLowerCase().match(/([\d.]+)\s*(kg|l|ml|g)\b/);
  if (!m) return false;
  const value = parseFloat(m[1]);
  const unit = m[2];
  if (unit === 'l') return value >= 5;
  if (unit === 'kg') return value >= 5;
  if (unit === 'ml') return value >= 5000;
  if (unit === 'g') return value >= 5000;
  return false;
}

function cleanText(s) {
  // Repair common mojibake en-dashes and stray whitespace.
  return String(s || '')
    .replace(/â€“/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function lc(s) {
  const t = cleanText(s);
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

// Build a long, professional B2B description from the product fields.
function generateDescription(p) {
  const profile = CATEGORY_PROFILES[p.cat] || DEFAULT_PROFILE;
  const name = cleanText(p.name) || 'This product';
  const size = cleanText(p.size);
  const sub = cleanText(p.sub);
  const bulk = isBulkSize(size);
  const benefits = Array.isArray(p.benefits)
    ? p.benefits.map(cleanText).filter(Boolean)
    : [];

  const sentences = [];

  // 1. What it is. Only add "(size)" when the name doesn't already show it.
  const nameHasSize =
    size && name.toLowerCase().replace(/\s+/g, '').includes(size.toLowerCase().replace(/\s+/g, ''));
  let opener = `${name}${size && !nameHasSize ? ` (${size})` : ''} is ${profile.intro}.`;
  if (sub) opener += ` ${sub.endsWith('.') ? sub : sub + '.'}`;
  sentences.push(opener);

  // 2. Where it is used / who it suits.
  sentences.push(
    `It is well suited to ${profile.uses}, giving ${profile.operators} a product they can rely on for ${profile.label} day in and day out.`
  );

  // 3. Benefits woven in (uses existing benefits where available).
  if (benefits.length) {
    const list = benefits.slice(0, 4).map(lc);
    const joined =
      list.length > 1
        ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]
        : list[0];
    sentences.push(`Key benefits include ${joined}.`);
  } else {
    sentences.push(
      `It is designed to be easy to use, effective on everyday soiling and dependable across repeat use.`
    );
  }

  // 4. Bulk / commercial angle.
  if (bulk) {
    sentences.push(
      `Supplied in a ${size} bulk pack, it is ideal for high-volume and commercial use, helping businesses lower their cost per use and keep a steady supply on hand.`
    );
  } else {
    sentences.push(
      `It is also available for bulk and commercial supply, making it easy for businesses to scale up their order as demand grows.`
    );
  }

  // 5. Quote / bulk-supply friendly close.
  sentences.push(
    `Available for bulk supply on request — contact us for a quote on wholesale and commercial quantities.`
  );

  return sentences.join(' ');
}

// Generic, realistic benefits to use ONLY when a product has none.
function generateBenefits(p) {
  const profile = CATEGORY_PROFILES[p.cat] || DEFAULT_PROFILE;
  return [
    'Professional cleaning performance',
    'Suitable for home and commercial use',
    `Trusted for ${profile.label}`,
    'Available in bulk supply',
  ];
}

async function main() {
  loadEnv();
  dns.setServers(['1.1.1.1', '8.8.8.8']);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in .env.local or environment.');
  }

  const apply = process.argv.includes('--apply');
  const forceAll = process.argv.includes('--force-all');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const client = new MongoClient(process.env.MONGODB_URI);
  const stats = { total: 0, toUpdate: 0, skipped: 0, benefitsFilled: 0, errors: 0 };

  try {
    await client.connect();
    const db = client.db();
    const products = db.collection('products');

    const all = await products.find({}).toArray();
    stats.total = all.length;

    // ── Always back up the full collection before any write ──
    const backupPath = join(BACKUP_DIR, `products-backup-${ts}.json`);
    writeFileSync(backupPath, JSON.stringify(all, null, 2), 'utf8');
    console.log(`Backup written: ${backupPath} (${all.length} products)`);

    const preview = [];
    const updates = [];

    for (const p of all) {
      const currentDesc = cleanText(p.desc);
      const longEnough = currentDesc.length >= MIN_GOOD_LENGTH;

      if (longEnough && !forceAll) {
        stats.skipped++;
        continue;
      }

      const newDesc = generateDescription(p);
      const set = { desc: newDesc, updatedAt: Date.now() };

      const hasBenefits = Array.isArray(p.benefits) && p.benefits.length > 0;
      if (!hasBenefits) {
        set.benefits = generateBenefits(p);
        stats.benefitsFilled++;
      }

      stats.toUpdate++;
      preview.push({
        id: p.id,
        name: p.name,
        cat: p.cat,
        size: p.size || '',
        oldLength: currentDesc.length,
        newLength: newDesc.length,
        oldDesc: currentDesc,
        newDesc,
        benefitsFilled: !hasBenefits,
      });
      updates.push({ id: p.id, set });
    }

    const previewPath = join(BACKUP_DIR, `preview-${ts}.json`);
    writeFileSync(previewPath, JSON.stringify(preview, null, 2), 'utf8');
    console.log(`Preview written: ${previewPath} (${preview.length} proposed changes)`);

    if (!apply) {
      console.log('\n── DRY RUN ──');
      console.log(JSON.stringify(stats, null, 2));
      if (preview[0]) {
        console.log('\nExample proposed description:');
        console.log(`  ${preview[0].name} [${preview[0].cat}]`);
        console.log(`  OLD (${preview[0].oldLength} chars): ${preview[0].oldDesc || '(empty)'}`);
        console.log(`  NEW (${preview[0].newLength} chars): ${preview[0].newDesc}`);
      }
      console.log('\nReview the preview file, then re-run with --apply to write to MongoDB.');
      return;
    }

    // ── APPLY: write ONLY desc (+ benefits when empty) + updatedAt ──
    console.log('\n── APPLYING UPDATES ──');
    for (const u of updates) {
      try {
        await products.updateOne({ id: u.id }, { $set: u.set });
      } catch (err) {
        stats.errors++;
        console.error(`  ERROR updating ${u.id}: ${err.message}`);
      }
    }

    const after = await products.countDocuments({});
    console.log(JSON.stringify({ ...stats, productCountAfter: after }, null, 2));
    console.log('\nDone. Only desc / benefits(empty) / updatedAt were modified.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
