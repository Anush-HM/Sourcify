async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned no content');
  return text;
}

// Tries Gemini first; on ANY failure (rate limit, downtime, malformed
// response), automatically retries the same prompt against Groq.
// Conversation state lives in MongoDB (Message docs), untouched by
// which provider answered — so a mid-session failover is invisible
// to the healing loop and the frontend.
async function callLLM(prompt, { label = 'llm-call' } = {}) {
  try {
    return await callGemini(prompt);
  } catch (err) {
    console.warn(`[${label}] Gemini failed (${err.message}), falling back to Groq`);
    return await callGroq(prompt);
  }
}

module.exports = { callLLM };