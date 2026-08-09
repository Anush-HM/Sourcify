const express = require('express');
const { generateReport } = require('../services/generateReport');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const sessionId = req.session.currentSessionId;
    const result = await generateReport(sessionId);
    if (!result) {
      return res.status(400).json({ error: 'No ingested sources to report on yet — add at least one source first.' });
    }
    res.json(result);
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: err.isProviderError ? err.message : 'Could not generate a report right now.' });
  }
});

module.exports = router;