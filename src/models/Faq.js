import mongoose from 'mongoose';

const FaqSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'General' },
    displayOrder: { type: Number, default: 99 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.models.Faq || mongoose.model('Faq', FaqSchema);
