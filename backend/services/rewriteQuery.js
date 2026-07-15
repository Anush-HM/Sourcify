const { callLLM } = require('./llm');

async function rewriteQuery(originalQuery, reason) {
  const prompt = `The following question returned weak or unsupported retrieval results. Rewrite it as a clearer, more specific question that would retrieve better evidence. Respond with ONLY the rewritten question, nothing else.

Original question: ${originalQuery}
Why it failed: ${reason}`;

  return callLLM(prompt, { label: 'rewrite' });
}

module.exports = { rewriteQuery };