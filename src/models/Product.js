import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  outOfStock: { type: Boolean, default: false },
});

const MediaSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  url: { type: String, required: true },
  storageKey: { type: String, default: null },
  altText: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now },
});

const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    cat: { type: String, required: true, index: true },
    sub: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
    was: { type: Number, default: null },
    size: { type: String, default: '' },
    rating: { type: Number, default: 5.0 },
    reviews: { type: Number, default: 0 },
    badge: { type: String, default: null },
    img: { type: String, required: true },
    benefits: [{ type: String }],
    desc: { type: String, default: '' },
    scent: { type: String, default: null },
    sku: { type: String, default: null },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    outOfStock: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive', 'draft', 'archived'], default: 'active' },
    variants: [VariantSchema],
    media: [MediaSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
