const express = require('express');
const Source = require('../models/Source');
const Chunk = require('../models/Chunk');
const { extractArticle } = require('../services/ingestArticle');
const { extractDiscussion } = require('../services/ingestDiscussion');
const { extractVideo } = require('../services/ingestVideo');
const { embedBatch } = require('../services/embeddings');

const router = express.Router();

router.get('/', async (req, res) => {
  const sources = await Source.find({ userId: req.session.userId }).sort({ createdAt: 1 });
  res.json({ sources: sources.map((s) => ({ id: s._id, type: s.type, url: s.url, status: s.status })) });
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

    let source = await Source.findOne({ userId: req.session.userId, type });
    if (source) {
      source.url = url;
      source.status = 'processing';
      await source.save();
    } else {
      source = await Source.create({ userId: req.session.userId, type, url, status: 'processing' });
    }

    // Re-ingesting this slot? Wipe old chunks first.
    await Chunk.deleteMany({ userId: req.session.userId, sourceId: source._id });

    const extractors = {
      article: extractArticle,
      discussion: extractDiscussion,
      video: extractVideo,
    };
    const extractor = extractors[type];

    let pieces;
    try {
      pieces = await extractor(url);
    } catch (err) {
      source.status = 'error';
      await source.save();
      return res.status(422).json({ error: `Could not ingest ${type}: ${err.message}` });
    }

    const texts = pieces.map((p) => p.text);
    const embeddings = await embedBatch(texts);

    const chunkDocs = pieces.map((p, i) => ({
      userId: req.session.userId,
      sourceId: source._id,
      type,
      url,
      text: p.text,
      embedding: embeddings[i],
      metadata: p.metadata,
    }));

    await Chunk.insertMany(chunkDocs);
    source.status = 'ready';
    await source.save();

    return res.json({
      source: { id: source._id, type: source.type, url: source.url, status: source.status },
      chunkCount: chunkDocs.length,
    });
  } catch (err) {
    console.error('Source create error:', err);
    res.status(500).json({ error: 'Could not save that source.' });
  }
});

router.delete('/:id', async (req, res) => {
  await Chunk.deleteMany({ sourceId: req.params.id, userId: req.session.userId });
  await Source.deleteOne({ _id: req.params.id, userId: req.session.userId });
  res.json({ ok: true });
});

module.exports = router;