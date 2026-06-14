import mongoose from 'mongoose';

const { Schema, models, model } = mongoose;

export const ORDER_STATUS_VALUES = [
  'Order Placed',
  'Awaiting Payment',
  'Confirmed',
  'Processing',
  'Dispatched',
  'Delivered',
  'Cancelled',
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
];

export const PAYMENT_STATUS_VALUES = [
  'pending',
  'paid',
  'failed',
  'refunded',
  'Cash Payment Pending',
  'Awaiting EFT Payment',
  'Proof of Payment Submitted',
  'Payment Verification Required',
  'Paid',
  'Refunded',
  'Failed',
  'Payment Rejected',
  'Corrected Proof Requested',
];

export const PAYMENT_METHOD_VALUES = ['EFT', 'COD'];
export const PRODUCT_STATUS_VALUES = ['active', 'inactive', 'draft', 'archived'];
export const REVIEW_STATUS_VALUES = ['pending', 'approved', 'rejected', 'hidden'];

const VariantSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  outOfStock: { type: Boolean, default: false },
}, { _id: false });

const MediaSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  url: { type: String, required: true },
  storageKey: { type: String, default: null },
  altText: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0, min: 0 },
  createdAt: { type: Number, default: Date.now },
}, { _id: false });

const ProductSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  cat: { type: String, required: true, index: true },
  sub: { type: String, default: '' },
  price: { type: Number, required: true, default: 0, min: 0 },
  was: { type: Number, default: null, min: 0 },
  size: { type: String, default: '' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: { type: Number, default: 0, min: 0 },
  badge: { type: String, default: null },
  img: { type: String, default: '' },
  secondaryImg: { type: String, default: '' },
  images: [{ type: String }],
  video: { type: String, default: '' },
  benefits: [{ type: String }],
  desc: { type: String, default: '' },
  scent: { type: String, default: null },
  sku: { type: String, default: null, index: true },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  outOfStock: { type: Boolean, default: false },
  status: { type: String, enum: PRODUCT_STATUS_VALUES, default: 'active', index: true },
  variants: [VariantSchema],
  media: [MediaSchema],
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

ProductSchema.index({ name: 1 });
ProductSchema.index({ createdAt: -1 });

const OrderItemSchema = new Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, default: 0, min: 0 },
  variation: { type: String, default: null },
}, { _id: false });

const PaymentHistorySchema = new Schema({
  previousStatus: { type: String, default: null },
  newStatus: { type: String, required: true, enum: PAYMENT_STATUS_VALUES },
  changedBy: { type: String, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Number, default: Date.now },
}, { _id: false });

const OrderTimelineSchema = new Schema({
  status: { type: String, default: '' },
  label: { type: String, default: '' },
  at: { type: Number, default: Date.now },
}, { _id: false });

const OrderSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  // Unique indexes for these fields must be created manually in Atlas after
  // running the duplicate checks documented in the launch runbook.
  orderNumber: { type: String, default: null },
  invoiceNumber: { type: String, default: null },
  customer: {
    id: { type: String, default: null },
    name: { type: String, default: '' },
    email: { type: String, default: '', index: true },
    phone: { type: String, default: '' },
  },
  customerId: { type: String, default: null, index: true },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  addressDetails: { type: Schema.Types.Mixed, default: null },
  address: { type: String, default: '' },
  shippingAddress: { type: Schema.Types.Mixed, default: null },
  billingAddress: { type: Schema.Types.Mixed, default: null },
  items: [OrderItemSchema],
  subtotal: { type: Number, default: 0, min: 0 },
  delivery: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  shippingRateName: { type: String, default: '' },
  couponDiscount: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  couponCode: { type: String, default: null },
  coupon: { type: String, default: '' },
  couponId: { type: String, default: null },
  codFee: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'ZAR' },
  paymentMethod: { type: String, enum: PAYMENT_METHOD_VALUES, required: true },
  paymentStatus: { type: String, enum: PAYMENT_STATUS_VALUES, required: true },
  orderStatus: { type: String, enum: ORDER_STATUS_VALUES, required: true },
  eftReference: { type: String, default: null },
  eftBankDetails: { type: Schema.Types.Mixed, default: null },
  proofOfPaymentUrl: { type: String, default: null },
  proofOfPaymentStorageKey: { type: String, default: null },
  proofOfPaymentMetadata: { type: Schema.Types.Mixed, default: null },
  paymentProof: { type: String, default: '' },
  invoiceUrl: { type: String, default: null },
  internalNotes: { type: Schema.Types.Mixed, default: '' },
  status: { type: String, enum: ORDER_STATUS_VALUES, default: 'pending' },
  payment: {
    method: { type: String, enum: PAYMENT_METHOD_VALUES },
    status: { type: String, enum: PAYMENT_STATUS_VALUES, default: 'pending' },
  },
  paymentStatusHistory: [PaymentHistorySchema],
  timeline: [OrderTimelineSchema],
  trackingNumber: { type: String, default: '' },
  carrier: { type: String, default: '' },
  trackingLink: { type: String, default: '' },
  dispatchDate: { type: Number, default: null },
  notes: { type: String, default: '' },
  date: { type: Number },
  idempotencyKey: { type: String, default: null, index: true },
  stockDeducted: { type: Boolean, default: false },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ paymentMethod: 1 });
OrderSchema.index({ 'customer.phone': 1 });

const AddressSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, default: 'Home' },
  line: { type: String, default: '' },
  city: { type: String, default: '' },
  province: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
}, { _id: false });

const CustomerSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  password: { type: String, select: false },
  addresses: [AddressSchema],
  orders: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0, min: 0 },
  role: { type: String, default: 'user' },
  avatar: { type: String, default: '' },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ createdAt: -1 });

const CouponSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  type: { type: String, enum: ['percentage', 'fixed', 'percent', 'flat'], default: 'percentage' },
  value: { type: Number, default: 0, min: 0 },
  discountType: { type: String, enum: ['percent', 'flat'], default: undefined },
  discountValue: { type: Number, default: undefined, min: 0 },
  minSpend: { type: Number, default: undefined, min: 0 },
  usageCount: { type: Number, default: undefined, min: 0 },
  status: { type: String, enum: ['active', 'inactive', 'expired'], default: undefined },
  active: { type: Boolean, default: true },
  expiresAt: { type: Number, default: null },
  maxUses: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  minOrderValue: { type: Number, default: 0, min: 0 },
  restrictToProducts: [{ type: String }],
  restrictToCategories: [{ type: String }],
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

const ReviewSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  productId: { type: String, required: true, index: true },
  productName: { type: String, default: '' },
  customerId: { type: String, default: null, index: true },
  email: { type: String, default: '' },
  author: { type: String, default: '' },
  customerName: { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: '' },
  date: { type: Number },
  status: { type: String, enum: REVIEW_STATUS_VALUES, default: 'pending' },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

ReviewSchema.index({ status: 1 });
ReviewSchema.index({ createdAt: -1 });

const FaqSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: 'General' },
  displayOrder: { type: Number, default: 99 },
  order: { type: Number, default: 99 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  enabled: { type: Boolean, default: true },
  showOnHomepage: { type: Boolean, default: false },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

const CategorySchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  short: { type: String, default: '' },
  icon: { type: String, default: 'Box' },
  count: { type: Number, default: 0, min: 0 },
  blurb: { type: String, default: '' },
  accent: { type: String, default: '#111111' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  displayOrder: { type: Number, default: 99 },
  image: { type: String, default: null },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

const ShippingRateSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  provider: { type: String, default: '' },
  price: { type: Number, default: undefined, min: 0 },
  minDays: { type: Number, default: undefined, min: 0 },
  maxDays: { type: Number, default: undefined, min: 0 },
  isFreeOver: { type: Boolean, default: undefined },
  freeOverAmount: { type: Number, default: undefined, min: 0 },
  default: { type: Boolean, default: undefined },
  country: { type: String, default: 'South Africa' },
  region: { type: String, default: '' },
  charge: { type: Number, required: true, default: 0, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  freeThreshold: { type: Number, default: 0, min: 0 },
  estimatedTime: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isDefault: { type: Boolean, default: false },
  displayPriority: { type: Number, default: 0 },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

const AbandonedCartSchema = new Schema({
  id: { type: String, required: true, unique: true },
  guestId: { type: String, default: null, index: true },
  customerId: { type: String, default: null, index: true },
  customerName: { type: String, default: '' },
  email: { type: String, default: '', index: true, lowercase: true },
  items: [{ type: Schema.Types.Mixed }],
  total: { type: Number, default: 0, min: 0 },
  date: { type: Number },
  recovered: { type: Boolean, default: false },
  converted: { type: Boolean, default: false },
  updatedAt: { type: Number },
}, { timestamps: true });

AbandonedCartSchema.index({ updatedAt: -1 });
AbandonedCartSchema.index({ createdAt: -1 });

const CartItemSchema = new Schema({
  id: { type: String, required: true },
  variation: { type: String, default: null },
  qty: { type: Number, required: true, min: 1 },
}, { _id: false });

const CartSchema = new Schema({
  guestId: { type: String, required: true, unique: true, index: true },
  items: [CartItemSchema],
  email: { type: String, default: null, index: true, lowercase: true },
  status: { type: String, enum: ['active', 'converted'], default: 'active' },
}, { timestamps: true });

const SettingsSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

const StockHistorySchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  productId: { type: String, required: true, index: true },
  variationName: { type: String, default: null },
  change: { type: Number, required: true },
  type: { type: String, enum: ['sale', 'refund', 'restock', 'correction', 'set'], required: true },
  reason: { type: String, default: '' },
  previousStock: { type: Number, required: true, min: 0 },
  newStock: { type: Number, required: true, min: 0 },
  performedBy: { type: String, required: true },
  createdAt: { type: Number },
  updatedAt: { type: Number },
}, { timestamps: true });

const EmailOtpSchema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, index: true, lowercase: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Number, required: true },
  attempts: { type: Number, default: 0, min: 0 },
  consumed: { type: Boolean, default: false },
  createdAt: { type: Number, required: true },
});

const CustomerSessionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerId: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true, lowercase: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Number, required: true },
  createdAt: { type: Number, required: true },
});

export const Product = models.Product || model('Product', ProductSchema);
export const Order = models.Order || model('Order', OrderSchema);
export const Customer = models.Customer || model('Customer', CustomerSchema);
export const Coupon = models.Coupon || model('Coupon', CouponSchema);
export const Review = models.Review || model('Review', ReviewSchema);
export const Faq = models.Faq || model('Faq', FaqSchema);
export const Category = models.Category || model('Category', CategorySchema);
export const ShippingRate = models.ShippingRate || model('ShippingRate', ShippingRateSchema);
export const AbandonedCart = models.AbandonedCart || model('AbandonedCart', AbandonedCartSchema);
export const Cart = models.Cart || model('Cart', CartSchema);
export const Settings = models.Settings || model('Settings', SettingsSchema);
export const Setting = Settings;
export const StockHistory = models.StockHistory || model('StockHistory', StockHistorySchema);
export const EmailOtp = models.EmailOtp || model('EmailOtp', EmailOtpSchema);
export const CustomerSession = models.CustomerSession || model('CustomerSession', CustomerSessionSchema);
