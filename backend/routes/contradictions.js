const express = require('express');
const { checkContradictions } = require('../services/checkContradictions');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const sessionId = req.session.currentSessionId;
    const result = await checkContradictions(sessionId);
    res.json(result);
  } catch (err) {
    console.error('Contradiction check error:', err);
    res.status(500).json({ error: 'Could not check for contradictions right now.' });
  }
});

module.exports = router;