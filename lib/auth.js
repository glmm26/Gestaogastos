const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  hashPassword,
  verifyPassword,
  generateOtp,
  generateSessionToken,
  hashSessionToken,
};
