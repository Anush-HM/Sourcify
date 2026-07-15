const { callLLM } = require('./llm');

async function gradeAnswer(question, draftAnswer, scoredChunks) {
  const context = scoredChunks
    .map((s, i) => `[${i}] (${s.chunk.type}) ${s.chunk.text}`)
    .join('\n\n');

  const prompt = `You are a strict grader. Judge whether the ANSWER below is genuinely supported by the CONTEXT. Do not use outside knowledge.

Respond with ONLY a JSON object, no markdown, no extra text:
{"verdict": "SUPPORTED" | "WEAK" | "UNSUPPORTED", "reason": "one short sentence"}

CONTEXT:
${context}

QUESTION: ${question}

ANSWER: ${draftAnswer}`;

  const raw = await callLLM(prompt, { label: 'grade' });

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!['SUPPORTED', 'WEAK', 'UNSUPPORTED'].includes(parsed.verdict)) {
      throw new Error('bad verdict');
    }
    return parsed;
  } catch {
    return { verdict: 'WEAK', reason: 'Grader response could not be parsed.' };
  }
}

module.exports = { gradeAnswer };