import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    discountType: { type: String, enum: ['percent', 'flat'], required: true },
    discountValue: { type: Number, required: true, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Number, default: null }, // timestamp
    maxUses: { type: Number, default: 0 }, // 0 means unlimited
    usedCount: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
