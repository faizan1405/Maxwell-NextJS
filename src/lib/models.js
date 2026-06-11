import mongoose from 'mongoose';

const { Schema, models, model } = mongoose;

const ProductSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cat: String,
  sub: String,
  price: Number,
  was: Number,
  size: String,
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  badge: String,
  img: String,
  secondaryImg: String,
  images: [String],
  video: String,
  benefits: [String],
  desc: String,
  scent: String,
  sku: String,
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  status: { type: String, default: 'active' },
  variants: [Schema.Types.Mixed],
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { strict: false });

const OrderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerId: String,
  customerName: String,
  customerEmail: String,
  status: String,
  items: [Schema.Types.Mixed],
  total: Number,
  subtotal: Number,
  shipping: Number,
  discount: Number,
  coupon: String,
  date: Number,
  timeline: [Schema.Types.Mixed],
  shippingAddress: Schema.Types.Mixed,
  billingAddress: Schema.Types.Mixed,
  paymentMethod: String,
  paymentProof: String,
  paymentStatus: String,
}, { strict: false });

const CustomerSchema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  password: { type: String, select: false },
  addresses: [Schema.Types.Mixed],
  orders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  createdAt: Number,
  avatar: String,
}, { strict: false });

const CouponSchema = new Schema({
  id: { type: String, required: true, unique: true },
  code: String,
  type: String,
  value: Number,
  minSpend: Number,
  usageCount: { type: Number, default: 0 },
  status: String,
}, { strict: false });

const ReviewSchema = new Schema({
  id: { type: String, required: true, unique: true },
  productId: String,
  productName: String,
  author: String,
  rating: Number,
  text: String,
  date: Number,
  status: String,
}, { strict: false });

const FaqSchema = new Schema({
  id: { type: String, required: true, unique: true },
  question: String,
  answer: String,
  status: String,
  order: Number,
}, { strict: false });

const CategorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  icon: String,
  count: Number,
  status: String,
}, { strict: false });

const ShippingRateSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  provider: String,
  price: Number,
  minDays: Number,
  maxDays: Number,
  isFreeOver: Boolean,
  freeOverAmount: Number,
  default: Boolean,
}, { strict: false });

const AbandonedCartSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerName: String,
  email: String,
  items: [Schema.Types.Mixed],
  total: Number,
  date: Number,
  recovered: Boolean,
}, { strict: false });

const SettingsSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
}, { strict: false });

const StockHistorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  productId: String,
  variationName: String,
  previousStock: Number,
  newStock: Number,
  reason: String,
  createdAt: Number,
}, { strict: false });

export const Product = models.Product || model('Product', ProductSchema);
export const Order = models.Order || model('Order', OrderSchema);
export const Customer = models.Customer || model('Customer', CustomerSchema);
export const Coupon = models.Coupon || model('Coupon', CouponSchema);
export const Review = models.Review || model('Review', ReviewSchema);
export const Faq = models.Faq || model('Faq', FaqSchema);
export const Category = models.Category || model('Category', CategorySchema);
export const ShippingRate = models.ShippingRate || model('ShippingRate', ShippingRateSchema);
export const AbandonedCart = models.AbandonedCart || model('AbandonedCart', AbandonedCartSchema);
export const Settings = models.Settings || model('Settings', SettingsSchema);
export const StockHistory = models.StockHistory || model('StockHistory', StockHistorySchema);
