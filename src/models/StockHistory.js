import mongoose from 'mongoose';

const StockHistorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    variationName: { type: String, default: null },
    change: { type: Number, required: true },
    type: { type: String, required: true }, // e.g. 'sale', 'refund', 'restock', 'correction'
    reason: { type: String, default: '' },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    performedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.StockHistory || mongoose.model('StockHistory', StockHistorySchema);
