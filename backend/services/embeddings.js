const { pipeline } = require('@xenova/transformers');

let extractorPromise = null;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

async function embedBatch(texts) {
  const extractor = await getExtractor();
  const embeddings = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }
  return embeddings;
}

async function embedOne(text) {
  const [vec] = await embedBatch([text]);
  return vec;
}

module.exports = { embedBatch, embedOne };