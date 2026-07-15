const express = require('express');
const Source = require('../models/Source');

const router = express.Router();

router.get('/', async (req, res) => {
  const sources = await Source.find({ userId: req.session.userId }).sort({ createdAt: 1 });
  res.json({ sources: sources.map((s) => ({ id: s._id, type: s.type, url: s.url })) });
});

router.post('/', async (req, res) => {
  try {
    const { type, url } = req.body;
    if (!['article', 'discussion', 'video'].includes(type)) {
      return res.status(400).json({ error: 'Invalid source type.' });
    }
    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    // TODO (step 2): replace this with the real ingestion pipeline —
    // fetch content, chunk it per source type, embed chunks, store them
    // on this Source document (or a related Chunk collection).
    let source = await Source.findOne({ userId: req.session.userId, type });
    if (source) {
      source.url = url;
      source.status = 'ready';
      await source.save();
    } else {
      source = await Source.create({ userId: req.session.userId, type, url, status: 'ready' });
    }

    res.json({ source: { id: source._id, type: source.type, url: source.url } });
  } catch (err) {
    console.error('Source create error:', err);
    res.status(500).json({ error: 'Could not save that source.' });
  }
});

router.delete('/:id', async (req, res) => {
  await Source.deleteOne({ _id: req.params.id, userId: req.session.userId });
  res.json({ ok: true });
});

module.exports = router;