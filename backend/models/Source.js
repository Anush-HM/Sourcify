const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['article', 'discussion', 'video'], required: true },
    url: { type: String, required: true },
    status: { type: String, enum: ['ready', 'processing', 'error'], default: 'ready' },
    // Populated in step 2 once the real ingestion pipeline exists:
    // chunks: [{ text, embedding, metadata }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Source', sourceSchema);