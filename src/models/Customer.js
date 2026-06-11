import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: 'Home' },
  line: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
});

const CustomerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    addresses: [AddressSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
