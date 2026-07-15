const express = require('express');
const Message = require('../models/Message');
const { retrieveTopChunks } = require('../services/retrieve');
const { generateDraftAnswer } = require('../services/generate');
const { gradeAnswer } = require('../services/grade');
const { rewriteQuery } = require('../services/rewriteQuery');

const router = express.Router();

const MAX_HEALING_ATTEMPTS = 2;
const VERDICT_CONFIDENCE = { SUPPORTED: 0.9, WEAK: 0.5, UNSUPPORTED: 0.15 };

async function runHealingLoop(userId, originalQuestion) {
  const healingLog = [];
  let query = originalQuestion;

  for (let attempt = 1; attempt <= MAX_HEALING_ATTEMPTS; attempt++) {
    const scoredChunks = await retrieveTopChunks(userId, query, { k: 5 });
    if (scoredChunks.length === 0) {
      healingLog.push({ attempt, query, verdict: 'UNSUPPORTED', reason: 'No ingested chunks available.' });
      return null;
    }

    const draftText = await generateDraftAnswer(query, scoredChunks);
    const { verdict, reason } = await gradeAnswer(originalQuestion, draftText, scoredChunks);
    healingLog.push({ attempt, query, verdict, reason });

    if (verdict === 'SUPPORTED' || attempt === MAX_HEALING_ATTEMPTS) {
      return { draftText, scoredChunks, verdict, healingLog };
    }

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
  const messages = await Message.find({ userId: req.session.userId }).sort({ createdAt: 1 });
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

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    await Message.create({ userId: req.session.userId, role: 'user', text: message });

    const result = await runHealingLoop(req.session.userId, message);

    if (!result) {
      const text = "I don't have any ingested sources to answer from yet — add a source first.";
      await Message.create({
        userId: req.session.userId, role: 'assistant', text,
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
      type: s.chunk.type, url: s.chunk.url, metadata: s.chunk.metadata, score: s.score,
    }));
    const confidence = VERDICT_CONFIDENCE[verdict];

    await Message.create({
      userId: req.session.userId, role: 'assistant', text: finalText,
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