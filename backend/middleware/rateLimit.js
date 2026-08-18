const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Rate-limit by logged-in user, not IP — these routes sit behind
// requireAuth already, so req.session.userId is guaranteed to be set
// by the time these limiters run. Falls back to IP only as a safety net.
// ipKeyGenerator normalizes IPv6 addresses so users can't bypass the
// limit by varying their address representation.
const keyByUser = (req) => req.session?.userId?.toString() || ipKeyGenerator(req.ip);

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,                 // 20 messages per 5 min — each one costs at least 2 LLM calls (draft + grade), more with retries
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: 'Too many messages — please wait a few minutes before sending more.' },
});

const sourcesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 ingest attempts per 15 min — each one scrapes/fetches externally and runs local embeddings
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { error: 'Too many source ingestion attempts — please wait before adding more.' },
});

module.exports = { chatLimiter, sourcesLimiter };