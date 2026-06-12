import mongoose from 'mongoose';
import Product from '../models/Product';
import Category from '../models/Category';
import ShippingRate from '../models/ShippingRate';
import Setting from '../models/Setting';
import demoProducts from '../../data/maxwell-products.json';

// MONGODB_URI must be set in .env.local (or deployment environment variables).
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Cached connection shared with mongoose.js. Both files share the same
// global.mongoose cache so only one real connection is opened per process.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SEED DATA
// These values are inserted exactly once when the database is empty.
// Admins can update them via the admin panel; these only serve as the starting
// point for fresh deployments or local development environments.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default product categories seeded into the Categories collection.
 * The `id` field is the slug used across the app to reference a category.
 * `displayOrder` controls the sort order in the storefront category list.
 */
const SEED_CATEGORIES = [
  { id: "household", name: "Household", short: "Household", icon: "Home", blurb: "Everyday surfaces, floors, fabrics & fresh-smelling rooms.", accent: "#1D4ED8", status: 'active', displayOrder: 1 },
  { id: "industrial", name: "Industrial", short: "Industrial", icon: "Spray", blurb: "Heavy-duty degreasers, cleaners and specialty solutions for industrial use.", accent: "#B45309", status: 'active', displayOrder: 2 },
  { id: "car", name: "Car Care", short: "Car Care", icon: "Car", blurb: "Showroom shine for tyres, dashboards & trim.", accent: "#0B2E6B", status: 'active', displayOrder: 3 },
  { id: "car-exterior", name: "Car Exterior", short: "Car Exterior", icon: "Car", blurb: "Tar removers, bumper black, chassis coatings & exterior detailing.", accent: "#1E3A5F", status: 'active', displayOrder: 4 },
  { id: "sanitiser", name: "Sanitisers", short: "Sanitisers", icon: "Shield", blurb: "High-purity protection that kills 99.9% of germs.", accent: "#159A4C", status: 'active', displayOrder: 5 },
];

/**
 * Default shipping rate used as a fallback when no province-specific or
 * country-specific rate matches. `isDefault: true` tells the shipping
 * resolver to use this rate as the last resort.
 *
 * Free shipping kicks in at orders >= R750 (freeThreshold).
 */
const DEFAULT_SHIPPING = [
  {
    id: 'default-rate',
    name: 'Standard Flat Rate',
    country: 'South Africa',
    region: '',
    charge: 85,
    minOrderAmount: 0,
    freeThreshold: 750,
    estimatedTime: '2-5 Business Days',
    status: 'active',
    isDefault: true,
    displayPriority: 999,
  }
];

/**
 * Global application settings stored under the key 'global_settings'.
 * These configure payment methods (COD/EFT), shipping, and business identity.
 *
 * Key fields:
 *   - cod.codFee: Optional surcharge added to COD orders (0 = no fee).
 *   - cod.minOrderAmount / maxOrderAmount: COD order value limits (0 = no limit).
 *   - eft.allowProofUpload: Whether customers can upload bank transfer proof.
 *   - shipping.provinceRates: Legacy per-province overrides (replaced by ShippingRate docs
 *     when admins set up rates via the admin panel).
 *   - invoiceCounter / orderCounter: Auto-incrementing sequences for invoice and order numbers.
 *     They start at 1000 and 10000 respectively so that generated numbers look professional
 *     from the first order (e.g., INV-2025-1001, #10001).
 */
const DEFAULT_SETTINGS = {
  cod: {
    enabled: true,
    description: 'Pay in cash when your order is delivered.',
    minOrderAmount: 0,
    maxOrderAmount: 0,
    codFee: 0,
    locationRestrictions: [],
    productRestrictions: [],
  },
  eft: {
    enabled: true,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'Current',
    swiftCode: '',
    instructions: '',
    allowProofUpload: false,
  },
  shipping: {
    freeThreshold: 750,
    flatFee: 85,
    // Legacy per-province rates used as a fallback when no ShippingRate document
    // matches. These are superseded by active ShippingRate documents created in
    // the admin Shipping editor.
    provinceRates: {
      'Gauteng':       75,
      'Western Cape':  120,
      'KwaZulu-Natal': 120,
      'Eastern Cape':  130,
      'Mpumalanga':    100,
      'Limpopo':       110,
      'North West':    100,
      'Free State':    110,
      'Northern Cape': 140,
    },
  },
  business: {
    name:      'Amahle Blue',
    tagline:   'Cleaning Solutions',
    vatNumber: '4930324332',
    email:     'info@amahle-blue.co.za',
    phone:     '067 101 4345',
    address:   'Unit H, 13 Main Reef Road, Dunswart, Boksburg, Gauteng, South Africa',
  },
  // Starting values for the invoice and order number sequences.
  // These are incremented by `nextInvoiceAndOrderNumber()` in the orders route.
  invoiceCounter: 1000,
  orderCounter: 10000,
};

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE SEEDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seeds the database with default data on first run.
 * Each collection is checked with `countDocuments()` before inserting so that
 * existing data is never overwritten. This makes the function safe to call on
 * every server startup.
 *
 * Seeding order matters:
 *   1. Settings  — must exist before orders are placed (counters, payment config).
 *   2. Categories — must exist before products reference them.
 *   3. Shipping Rates — needed for the order shipping resolver.
 *   4. Products  — demo products are upserted (not inserted blindly) to avoid
 *      duplicating products that were already imported by an admin.
 */
export async function seedDatabase() {
  try {
    // 1. Seed global Settings (only if the collection is empty)
    const settingsCount = await Setting.countDocuments();
    if (settingsCount === 0) {
      await Setting.create({ key: 'global_settings', value: DEFAULT_SETTINGS });
      console.log('[db] Seeded global settings.');
    }

    // 2. Seed Categories (only if the collection is empty)
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      await Category.insertMany(SEED_CATEGORIES);
      console.log('[db] Seeded categories.');
    }

    // 3. Seed Shipping Rates (only if the collection is empty)
    const shippingCount = await ShippingRate.countDocuments();
    if (shippingCount === 0) {
      await ShippingRate.insertMany(DEFAULT_SHIPPING);
      console.log('[db] Seeded default shipping rate.');
    }

    // 4. Seed Products — uses $setOnInsert (upsert) so existing products are
    // never overwritten. Only truly new product IDs will be inserted.
    if (Array.isArray(demoProducts) && demoProducts.length > 0) {
      const ops = demoProducts.map(p => ({
        updateOne: {
          filter: { id: p.id },
          update: {
            $setOnInsert: {
              ...p,
              variants: Array.isArray(p.variants) ? p.variants : [],
              media: Array.isArray(p.media) ? p.media : [],
            },
          },
          upsert: true,
        },
      }));
      const result = await Product.bulkWrite(ops, { ordered: false });
      if (result.upsertedCount > 0) {
        console.log(`[db] Seeded ${result.upsertedCount} new products from JSON.`);
      }
    }
  } catch (err) {
    console.error('[db] Error seeding database:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY CONNECTION HELPER (dbConnect)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Legacy default export kept for backward compatibility with any code that
 * imports `dbConnect` directly. New code should use `connectToDatabase` from
 * `src/lib/mongoose.js` which has more robust seeding guard logic.
 */
async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('[db] Mongoose connected successfully.');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    // Perform lazy seeding after connection is established
    await seedDatabase();
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
