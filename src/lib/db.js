import mongoose from 'mongoose';
import Product from '../models/Product';
import Category from '../models/Category';
import ShippingRate from '../models/ShippingRate';
import Setting from '../models/Setting';
import demoProducts from '../../data/maxwell-products.json';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Default Seed Constants
const SEED_CATEGORIES = [
  { id: "household", name: "Household", short: "Household", icon: "Home", blurb: "Everyday surfaces, floors, fabrics & fresh-smelling rooms.", accent: "#1D4ED8", status: 'active', displayOrder: 1 },
  { id: "industrial", name: "Industrial", short: "Industrial", icon: "Spray", blurb: "Heavy-duty degreasers, cleaners and specialty solutions for industrial use.", accent: "#B45309", status: 'active', displayOrder: 2 },
  { id: "car", name: "Car Care", short: "Car Care", icon: "Car", blurb: "Showroom shine for tyres, dashboards & trim.", accent: "#0B2E6B", status: 'active', displayOrder: 3 },
  { id: "car-exterior", name: "Car Exterior", short: "Car Exterior", icon: "Car", blurb: "Tar removers, bumper black, chassis coatings & exterior detailing.", accent: "#1E3A5F", status: 'active', displayOrder: 4 },
  { id: "sanitiser", name: "Sanitisers", short: "Sanitisers", icon: "Shield", blurb: "High-purity protection that kills 99.9% of germs.", accent: "#159A4C", status: 'active', displayOrder: 5 },
];

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
  invoiceCounter: 1000,
  orderCounter: 10000,
};

export async function seedDatabase() {
  try {
    // 1. Seed Settings
    const settingsCount = await Setting.countDocuments();
    if (settingsCount === 0) {
      await Setting.create({ key: 'global_settings', value: DEFAULT_SETTINGS });
      console.log('[db] Seeded global settings.');
    }

    // 2. Seed Categories
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      await Category.insertMany(SEED_CATEGORIES);
      console.log('[db] Seeded categories.');
    }

    // 3. Seed Shipping Rates
    const shippingCount = await ShippingRate.countDocuments();
    if (shippingCount === 0) {
      await ShippingRate.insertMany(DEFAULT_SHIPPING);
      console.log('[db] Seeded default shipping rate.');
    }

    // 4. Seed Products — upsert from imported JSON so demo products are always present
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
    // Perform lazy seeding
    await seedDatabase();
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
