import mongoose from 'mongoose';

const ShippingRateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    country: { type: String, default: 'South Africa' },
    region: { type: String, default: '' }, // e.g. 'Gauteng'
    charge: { type: Number, required: true, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    freeThreshold: { type: Number, default: 0 },
    estimatedTime: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDefault: { type: Boolean, default: false },
    displayPriority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.ShippingRate || mongoose.model('ShippingRate', ShippingRateSchema);
