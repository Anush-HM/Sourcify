const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

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
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    await Message.create({ userId: req.session.userId, role: 'user', text: message });

    // TODO (step 3+): replace this placeholder with the real pipeline —
    // retrieve chunks -> draft answer -> grade -> heal/retry if needed ->
    // return {text, citations, confidence, healingLog}.
    const placeholderText =
      "The RAG pipeline isn't wired up yet — this is a placeholder reply so the chat UI can be tested end-to-end. Real grounded answers will appear here once ingestion and retrieval are built.";

    const assistant = await Message.create({
      userId: req.session.userId,
      role: 'assistant',
      text: placeholderText,
      citations: [],
      confidence: 0,
      healingLog: [],
    });

    res.json({
      assistantMessage: {
        text: assistant.text,
        citations: assistant.citations,
        confidence: assistant.confidence,
        healingLog: assistant.healingLog,
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Could not process that message.' });
  }
});

module.exports = router;