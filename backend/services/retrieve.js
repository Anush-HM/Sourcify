const Chunk = require('../models/Chunk');
const { embedOne } = require('./embeddings');

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

async function retrieveTopChunks(sessionId, query, { k = 5, excludeTypes = [] } = {}) {
  const queryVec = await embedOne(query);
  const filter = { sessionId };
  if (excludeTypes.length) filter.type = { $nin: excludeTypes };

  const chunks = await Chunk.find(filter).lean();
  const scored = chunks.map((c) => ({ chunk: c, score: cosineSimilarity(queryVec, c.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

module.exports = { retrieveTopChunks };