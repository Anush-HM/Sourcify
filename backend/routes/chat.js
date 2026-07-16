const express = require('express');
const Message = require('../models/Message');
const { retrieveTopChunks } = require('../services/retrieve');
const { generateDraftAnswer } = require('../services/generate');
const { gradeAnswer } = require('../services/grade');
const { rewriteQuery } = require('../services/rewriteQuery');

const router = express.Router();

const MAX_HEALING_ATTEMPTS = 2;
const VERDICT_CONFIDENCE = { SUPPORTED: 0.9, WEAK: 0.5, UNSUPPORTED: 0.15 };
const CITATION_TEXT_LIMIT = 600;

async function runHealingLoop(sessionId, originalQuestion) {
  const healingLog = [];
  let query = originalQuestion;
  let previousTypes = [];

  for (let attempt = 1; attempt <= MAX_HEALING_ATTEMPTS; attempt++) {
    let scoredChunks = await retrieveTopChunks(sessionId, query, { k: 5 });
    if (scoredChunks.length === 0) {
      healingLog.push({ attempt, query, verdict: 'UNSUPPORTED', reason: 'No ingested chunks available.' });
      return null;
    }

    if (attempt > 1 && previousTypes.length) {
      const supplemental = await retrieveTopChunks(sessionId, query, { k: 3, excludeTypes: previousTypes });
      if (supplemental.length) {
        const seenIds = new Set(scoredChunks.map((s) => String(s.chunk._id)));
        for (const s of supplemental) {
          if (!seenIds.has(String(s.chunk._id))) {
            scoredChunks.push(s);
            seenIds.add(String(s.chunk._id));
          }
        }
        scoredChunks.sort((a, b) => b.score - a.score);
      }
    }

    const draftText = await generateDraftAnswer(query, scoredChunks);
    const { verdict, reason } = await gradeAnswer(originalQuestion, draftText, scoredChunks);

    const typesUsed = [...new Set(scoredChunks.map((s) => s.chunk.type))];
    healingLog.push({ attempt, query, verdict, reason, sourceTypesUsed: typesUsed });

    if (verdict === 'SUPPORTED' || attempt === MAX_HEALING_ATTEMPTS) {
      return { draftText, scoredChunks, verdict, healingLog };
    }

    previousTypes = typesUsed;
    query = await rewriteQuery(query, reason);
  }
}

async function streamText(send, text) {
  const words = text.split(' ');
  for (const word of words) {
    send('token', { token: word + ' ' });
    await new Promise((r) => setTimeout(r, 20));
  }
}

router.get('/', async (req, res) => {
  const messages = await Message.find({ sessionId: req.session.currentSessionId }).sort({ createdAt: 1 });
  res.json({
    messages: messages.map((m) => ({
      role: m.role,
      text: m.text,
      citations: m.citations,
      confidence: m.confidence,
      healingLog: m.healingLog,
    })),
  });
});

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const sessionId = req.session.currentSessionId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    await Message.create({ userId: req.session.userId, sessionId, role: 'user', text: message });

    const result = await runHealingLoop(sessionId, message);

    if (!result) {
      const text = "I don't have any ingested sources to answer from yet — add a source first.";
      await Message.create({
        userId: req.session.userId, sessionId, role: 'assistant', text,
        citations: [], confidence: 0, healingLog: [],
      });
      await streamText(send, text);
      send('done', { citations: [], confidence: 0, healingLog: [] });
      return res.end();
    }

    const { draftText, scoredChunks, verdict, healingLog } = result;
    const finalText = verdict === 'SUPPORTED'
      ? draftText
      : "I couldn't find a well-grounded answer to that in your ingested sources — the retrieved evidence didn't clearly support a confident answer even after retrying with a rewritten query.";

    const citations = scoredChunks.map((s) => ({
      type: s.chunk.type,
      url: s.chunk.url,
      metadata: s.chunk.metadata,
      score: s.score,
      text: s.chunk.text.length > CITATION_TEXT_LIMIT
        ? s.chunk.text.slice(0, CITATION_TEXT_LIMIT) + '…'
        : s.chunk.text,
    }));
    const confidence = VERDICT_CONFIDENCE[verdict];

    await Message.create({
      userId: req.session.userId, sessionId, role: 'assistant', text: finalText,
      citations, confidence, healingLog,
    });

    await streamText(send, finalText);
    send('done', { citations, confidence, healingLog });
    res.end();
  } catch (err) {
    console.error('Chat stream error:', err);
    send('error', { error: 'Could not process that message.' });
    res.end();
  }
});

module.exports = router;