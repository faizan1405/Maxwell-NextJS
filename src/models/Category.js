import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    short: { type: String },
    icon: { type: String, default: 'Box' },
    blurb: { type: String, default: '' },
    accent: { type: String, default: '#0B2545' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    displayOrder: { type: Number, default: 99 },
    image: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
