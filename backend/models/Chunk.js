const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Source', required: true, index: true },
    type: { type: String, enum: ['article', 'discussion', 'video'], required: true },
    url: { type: String, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
      paragraphIndex: Number,
      commentId: String,
      startTime: Number,
      endTime: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chunk', chunkSchema);