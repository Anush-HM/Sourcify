const Session = require('../models/Session');

module.exports = async function requireSession(req, res, next) {
  try {
    if (req.session.currentSessionId) {
      const exists = await Session.exists({ _id: req.session.currentSessionId, userId: req.session.userId });
      if (exists) return next();
    }
    let session = await Session.findOne({ userId: req.session.userId }).sort({ updatedAt: -1 });
    if (!session) {
      session = await Session.create({ userId: req.session.userId, title: 'New topic' });
    }
    req.session.currentSessionId = session._id.toString();
    next();
  } catch (err) {
    console.error('requireSession error:', err);
    res.status(500).json({ error: 'Could not resolve session.' });
  }
};