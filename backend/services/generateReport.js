const Chunk = require('../models/Chunk');
const { callLLM } = require('./llm');

// Keep the prompt bounded even on chunk-heavy sessions — sources are
// already capped at 80 chunks each on ingest, so 40/type keeps total
// context reasonable while still covering a full source end-to-end.
const MAX_PER_TYPE = 12;
const CITATION_TEXT_LIMIT = 600;

// Same numbered-context pattern used in generate.js/grade.js, so the
// frontend's existing linkifyCitations()/openCitationModal() just work.
function buildNumberedContext(chunks) {
  return chunks.map((c, i) => `[${i}] (${c.type}) ${c.text}`).join('\n\n');
}

function toCitation(c) {
  return {
    type: c.type,
    url: c.url,
    metadata: c.metadata,
    text: c.text.length > CITATION_TEXT_LIMIT ? c.text.slice(0, CITATION_TEXT_LIMIT) + '…' : c.text,
  };
}

async function generateReport(sessionId) {
  const chunks = await Chunk.find({ sessionId }).sort({ createdAt: 1 }).lean();
  if (chunks.length === 0) return null;

  const byType = { article: [], discussion: [], video: [] };
  chunks.forEach((c) => { if (byType[c.type]) byType[c.type].push(c); });

  const selected = [];
  Object.values(byType).forEach((list) => selected.push(...list.slice(0, MAX_PER_TYPE)));

  const sourceCounts = {
    article: byType.article.length,
    discussion: byType.discussion.length,
    video: byType.video.length,
  };
  const typesPresent = Object.entries(sourceCounts).filter(([, n]) => n > 0).map(([t]) => t);
  const context = buildNumberedContext(selected);

  const prompt = `You are producing a research report synthesizing evidence from ${typesPresent.length} source type(s) (${typesPresent.join(', ')}) that all cover the same topic. Use ONLY the numbered context below — never add outside knowledge or invented facts.

Write a clearly structured plain-text report. Start each section with a line beginning "## " exactly as shown:

## Overview
2-3 sentences on what the sources collectively cover.

## Key Points
The most important points, drawing across the sources.

## Where Sources Agree
Points reinforced by more than one source type. If none, say so briefly.

## Where Sources Differ
Genuine differences in claims, framing, or conclusions across source types. If none, say so briefly.

## Takeaways
2-4 concise closing takeaways.

Whenever you state something drawn from the context, cite the context number(s) in square brackets right after it, e.g. [0] or [2, 5].

Context:
${context}`;

  let reportText;
  try {
    reportText = await callLLM(prompt, { label: 'report' });
  } catch (err) {
    console.error('[report] Both LLM providers failed:', err.message);
    const providerErr = new Error('Could not reach the AI provider to generate the report — the Gemini and Groq API keys may be invalid, rate-limited, or out of quota.');
    providerErr.isProviderError = true;
    throw providerErr;
  }

  return {
    reportText,
    citations: selected.map(toCitation),
    sourceCounts,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generateReport };