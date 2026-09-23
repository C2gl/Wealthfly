const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  authEnabled,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
} = require('../auth');

const router = express.Router();

// Slow down brute-forcing of the single shared password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many login attempts, try again later' },
});

router.get('/session', (req, res) => {
  res.json({
    authRequired: authEnabled(),
    authenticated: isAuthenticated(req),
  });
});

router.post('/login', loginLimiter, async (req, res) => {
  if (!authEnabled()) {
    return res.json({ ok: true });
  }
  const { password } = req.body || {};
  const valid = await verifyPassword(password);
  if (!valid) {
    return res.status(401).json({ error: 'invalid password' });
  }
  setSessionCookie(res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
