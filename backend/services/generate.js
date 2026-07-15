const { callLLM } = require('./llm');

async function generateDraftAnswer(question, scoredChunks) {
  const context = scoredChunks
    .map((s, i) => `[${i}] (${s.chunk.type}) ${s.chunk.text}`)
    .join('\n\n');

  const prompt = `Answer the question using ONLY the numbered context below. If the context doesn't contain enough information, say so plainly. Cite the context numbers you used in square brackets, e.g. [0], [2].

Context:
${context}

Question: ${question}`;

  return callLLM(prompt, { label: 'generate' });
}

module.exports = { generateDraftAnswer };