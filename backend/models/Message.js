const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    citations: { type: Array, default: [] },
    confidence: { type: Number, default: 0 },
    healingLog: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);