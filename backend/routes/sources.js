const express = require('express');
const Source = require('../models/Source');
const Chunk = require('../models/Chunk');
const Session = require('../models/Session');
const { extractArticle } = require('../services/ingestArticle');
const { extractDiscussion } = require('../services/ingestDiscussion');
const { extractVideo } = require('../services/ingestVideo');
const { embedBatch } = require('../services/embeddings');

const router = express.Router();

const MAX_CHUNKS_PER_SOURCE = 80;

router.get('/', async (req, res) => {
  const sources = await Source.find({ sessionId: req.session.currentSessionId }).sort({ createdAt: 1 });
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

    const sessionId = req.session.currentSessionId;

    let source = await Source.findOne({ sessionId, url });
    if (source) {
      source.status = 'processing';
      await source.save();
    } else {
      source = await Source.create({ userId: req.session.userId, sessionId, type, url, status: 'processing' });
    }

    await Chunk.deleteMany({ sessionId, sourceId: source._id });

    const extractors = { article: extractArticle, discussion: extractDiscussion, video: extractVideo };
    const extractor = extractors[type];

    let pieces;
    try {
      pieces = await extractor(url);
    } catch (err) {
      source.status = 'error';
      await source.save();
      return res.status(422).json({ error: `Could not ingest ${type}: ${err.message}` });
    }

    const wasTruncated = pieces.length > MAX_CHUNKS_PER_SOURCE;
    if (wasTruncated) pieces = pieces.slice(0, MAX_CHUNKS_PER_SOURCE);

    const texts = pieces.map((p) => p.text);
    const embeddings = await embedBatch(texts);

    const chunkDocs = pieces.map((p, i) => ({
      userId: req.session.userId,
      sessionId,
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

    // Give the topic a friendlier name than "New topic" once it has its
    // first real source, so it's recognizable later in the history list.
    const session = await Session.findById(sessionId);
    if (session && session.title === 'New topic') {
      try {
        session.title = new URL(url).hostname.replace(/^www\./, '');
        await session.save();
      } catch { /* leave default title if URL parsing somehow fails */ }
    }

    return res.json({
      source: { id: source._id, type: source.type, url: source.url, status: source.status },
      chunkCount: chunkDocs.length,
      truncated: wasTruncated,
    });
  } catch (err) {
    console.error('Source create error:', err);
    res.status(500).json({ error: 'Could not save that source.' });
  }
});

router.delete('/:id', async (req, res) => {
  await Chunk.deleteMany({ sourceId: req.params.id, sessionId: req.session.currentSessionId });
  await Source.deleteOne({ _id: req.params.id, sessionId: req.session.currentSessionId });
  res.json({ ok: true });
});

module.exports = router;