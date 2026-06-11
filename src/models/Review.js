import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    customerId: { type: String, default: null, index: true },
    email: { type: String, default: '' },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'hidden'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
