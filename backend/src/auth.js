const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'wealthfly_session';
const SESSION_VALUE = 'authenticated';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Auth is only active when a password is configured. This keeps upgrades from
// an existing, password-less install non-breaking (with a loud warning).
function authEnabled() {
  return Boolean(process.env.WEALTHFLY_PASSWORD);
}

// Constant-time comparison, hashed first so mismatched lengths don't leak via
// crypto.timingSafeEqual's own length check.
function verifyPassword(candidate) {
  const expected = process.env.WEALTHFLY_PASSWORD;
  if (!expected || typeof candidate !== 'string' || !candidate) return false;
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  const candidateDigest = crypto.createHash('sha256').update(candidate).digest();
  return crypto.timingSafeEqual(expectedDigest, candidateDigest);
}

function setSessionCookie(res) {
  res.cookie(SESSION_COOKIE_NAME, SESSION_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    signed: true,
    maxAge: SESSION_MAX_AGE_MS,
    // Only require HTTPS for the cookie when we're actually served over it;
    // most self-hosted setups sit behind a LAN/VPN on plain http.
    secure: process.env.WEALTHFLY_FORCE_SECURE_COOKIE === 'true',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME);
}

function isAuthenticated(req) {
  if (!authEnabled()) return true;
  return req.signedCookies?.[SESSION_COOKIE_NAME] === SESSION_VALUE;
}

// Mount on any router/app that should require a valid session once auth is enabled.
function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'unauthenticated' });
}

module.exports = {
  SESSION_COOKIE_NAME,
  authEnabled,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  requireAuth,
};
