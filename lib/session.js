const { parseCookies, serializeCookie, sendJson } = require('./http');
const { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS, generateSessionToken, hashSessionToken } = require('./auth');
const sessionsRepo = require('../db/repositories/sessions');
const usersRepo = require('../db/repositories/users');

function getAuthenticatedUser(db, req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const session = sessionsRepo.getSessionByTokenHash(db, hashSessionToken(token));
  if (!session) return null;

  return usersRepo.getUserById(db, session.userId);
}

function createSessionCookie(db, res, userId) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
  sessionsRepo.createSession(db, { userId, tokenHash: hashSessionToken(token), expiresAt });
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, token, { maxAgeSeconds: SESSION_DURATION_SECONDS }));
}

function clearSessionCookie(db, req, res) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    sessionsRepo.deleteSessionByTokenHash(db, hashSessionToken(token));
  }
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', { clear: true }));
}

function requireAuth(db, req, res) {
  const user = getAuthenticatedUser(db, req);
  if (!user) {
    sendJson(res, 401, { message: 'Sessão inválida ou expirada. Faça login novamente.' });
    return null;
  }
  return user;
}

module.exports = {
  getAuthenticatedUser,
  createSessionCookie,
  clearSessionCookie,
  requireAuth,
};
