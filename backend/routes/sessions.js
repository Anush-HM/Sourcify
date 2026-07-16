const express = require('express');
const Session = require('../models/Session');
const Source = require('../models/Source');
const Chunk = require('../models/Chunk');
const Message = require('../models/Message');

const router = express.Router();

router.get('/', async (req, res) => {
  const sessions = await Session.find({ userId: req.session.userId }).sort({ updatedAt: -1 });
  const withCounts = await Promise.all(sessions.map(async (s) => ({
    id: s._id,
    title: s.title,
    sourceCount: await Source.countDocuments({ sessionId: s._id }),
    isCurrent: req.session.currentSessionId === s._id.toString(),
    updatedAt: s.updatedAt,
  })));
  res.json({ sessions: withCounts });
});

router.post('/', async (req, res) => {
  const session = await Session.create({ userId: req.session.userId, title: 'New topic' });
  req.session.currentSessionId = session._id.toString();
  res.json({ session: { id: session._id, title: session.title } });
});

router.post('/:id/activate', async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!session) return res.status(404).json({ error: 'Topic not found.' });
  req.session.currentSessionId = session._id.toString();
  res.json({ session: { id: session._id, title: session.title } });
});

router.delete('/:id', async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!session) return res.status(404).json({ error: 'Topic not found.' });

  await Chunk.deleteMany({ sessionId: session._id });
  await Source.deleteMany({ sessionId: session._id });
  await Message.deleteMany({ sessionId: session._id });
  await session.deleteOne();

  if (req.session.currentSessionId === req.params.id) req.session.currentSessionId = null;
  res.json({ ok: true });
});

module.exports = router;