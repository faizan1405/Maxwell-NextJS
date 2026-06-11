import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // product id
  variation: { type: String, default: null }, // variant name
  qty: { type: Number, required: true, min: 1 },
});

const CartSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, unique: true, index: true },
    items: [CartItemSchema],
    email: { type: String, default: null, index: true, lowercase: true },
    status: { type: String, enum: ['active', 'converted'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.models.Cart || mongoose.model('Cart', CartSchema);
