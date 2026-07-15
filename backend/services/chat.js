const { retrieveTopChunks } = require('../services/retrieve');
const { generateDraftAnswer } = require('../services/generate');

// ...inside router.post('/', ...), replacing the placeholder section:
const scoredChunks = await retrieveTopChunks(req.session.userId, message, { k: 5 });

if (scoredChunks.length === 0) {
  const assistant = await Message.create({
    userId: req.session.userId,
    role: 'assistant',
    text: "I don't have any ingested sources to answer from yet — add a source first.",
    citations: [],
    confidence: 0,
    healingLog: [],
  });
  return res.json({ assistantMessage: {
    text: assistant.text, citations: assistant.citations,
    confidence: assistant.confidence, healingLog: assistant.healingLog,
  }});
}

const draftText = await generateDraftAnswer(message, scoredChunks);

const citations = scoredChunks.map((s) => ({
  type: s.chunk.type,
  url: s.chunk.url,
  metadata: s.chunk.metadata,
  score: s.score,
}));

const assistant = await Message.create({
  userId: req.session.userId,
  role: 'assistant',
  text: draftText,
  citations,
  confidence: null, // real grounding score comes in the self-healing step (build step 3)
  healingLog: [],
});