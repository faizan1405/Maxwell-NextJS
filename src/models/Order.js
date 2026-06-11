import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, default: 0 },
  variation: { type: String, default: null },
});

const PaymentHistorySchema = new mongoose.Schema({
  previousStatus: { type: String, default: null },
  newStatus: { type: String, required: true },
  changedBy: { type: String, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Number, default: Date.now },
});

const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    customer: {
      id: { type: String, default: null },
      name: { type: String, required: true },
      email: { type: String, required: true, index: true },
      phone: { type: String, default: '' },
    },
    addressDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    address: { type: String, required: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    delivery: { type: Number, required: true, default: 0 },
    shippingRateName: { type: String, default: '' },
    couponDiscount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    couponId: { type: String, default: null },
    codFee: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'ZAR' },
    paymentMethod: { type: String, required: true, enum: ['EFT', 'COD'] },
    paymentStatus: { type: String, required: true },
    orderStatus: { type: String, required: true },
    eftReference: { type: String, default: null },
    eftBankDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    proofOfPaymentUrl: { type: String, default: null },
    proofOfPaymentStorageKey: { type: String, default: null },
    proofOfPaymentMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
    invoiceUrl: { type: String, default: null },
    internalNotes: { type: String, default: '' },
    /* Backward-compat fields */
    status: { type: String, default: 'pending' },
    payment: {
      method: { type: String },
      status: { type: String, default: 'pending' },
    },
    paymentStatusHistory: [PaymentHistorySchema],
    notes: { type: String, default: '' },
    idempotencyKey: { type: String, default: null, index: true },
    customerId: { type: String, default: null, index: true },
    stockDeducted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
