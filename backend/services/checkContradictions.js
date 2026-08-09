const Chunk = require('../models/Chunk');
const { callLLM } = require('./llm');

const MAX_PER_TYPE = 12;
const CITATION_TEXT_LIMIT = 600;

function toCitation(c) {
  return {
    type: c.type,
    url: c.url,
    metadata: c.metadata,
    text: c.text.length > CITATION_TEXT_LIMIT ? c.text.slice(0, CITATION_TEXT_LIMIT) + '…' : c.text,
  };
}

async function checkContradictions(sessionId) {
  const chunks = await Chunk.find({ sessionId }).sort({ createdAt: 1 }).lean();

  const byType = { article: [], discussion: [], video: [] };
  chunks.forEach((c) => { if (byType[c.type]) byType[c.type].push(c); });
  const typesPresent = Object.entries(byType).filter(([, list]) => list.length > 0);

  if (typesPresent.length < 2) {
    return {
      hasContradictions: false,
      contradictions: [],
      insufficientSources: true,
      message: 'Add at least two different source types to check for contradictions between them.',
    };
  }

  const selected = [];
  Object.values(byType).forEach((list) => selected.push(...list.slice(0, MAX_PER_TYPE)));
  const context = selected.map((c, i) => `[${i}] (${c.type}) ${c.text}`).join('\n\n');

  const prompt = `You are comparing evidence from different source types on the same topic, looking for genuine factual contradictions — places where sources make incompatible claims about the same fact, number, timeline, or outcome. Do NOT flag mere differences in emphasis, tone, level of detail, wording, or opinion — only actual conflicting claims.

Use ONLY the numbered context below. Respond with ONLY a JSON object, no markdown fences, no extra text, in exactly this shape:
{"hasContradictions": boolean, "contradictions": [{"topic": "short phrase naming what's contradicted", "explanation": "one or two sentences explaining the conflict, in your own words", "chunkA": <context number>, "chunkB": <context number>}]}

If nothing genuinely contradicts, return {"hasContradictions": false, "contradictions": []}.

Context:
${context}`;

  let raw;
  try {
    raw = await callLLM(prompt, { label: 'contradictions' });
  } catch (err) {
    console.error('[contradictions] Both LLM providers failed:', err.message);
    return {
      hasContradictions: false,
      contradictions: [],
      error: 'Could not reach the AI provider to check for contradictions — the Gemini and Groq API keys may be invalid, rate-limited, or out of quota. Check the server logs and your .env keys.',
    };
  }

  let parsed;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
    if (typeof parsed.hasContradictions !== 'boolean' || !Array.isArray(parsed.contradictions)) {
      throw new Error('bad shape');
    }
  } catch {
    return {
      hasContradictions: false,
      contradictions: [],
      error: 'Could not parse a clear answer — try again in a moment.',
    };
  }

  const contradictions = parsed.contradictions
    .filter((c) => selected[c.chunkA] && selected[c.chunkB] && selected[c.chunkA].type !== selected[c.chunkB].type)
    .map((c) => ({
      topic: c.topic || 'Contradiction',
      explanation: c.explanation || '',
      citationA: toCitation(selected[c.chunkA]),
      citationB: toCitation(selected[c.chunkB]),
    }));

  return {
    hasContradictions: contradictions.length > 0,
    contradictions,
    sourceTypesCompared: typesPresent.map(([t]) => t),
  };
}

module.exports = { checkContradictions };