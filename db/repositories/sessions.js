function createSession(db, { userId, tokenHash, expiresAt }) {
  db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
    userId,
    tokenHash,
    expiresAt
  );
}

function getSessionByTokenHash(db, tokenHash) {
  const row = db
    .prepare('SELECT * FROM sessions WHERE token_hash = ? AND datetime(expires_at) > datetime(\'now\')')
    .get(tokenHash);
  if (!row) return null;
  return { id: row.id, userId: row.user_id, expiresAt: row.expires_at };
}

function deleteSessionByTokenHash(db, tokenHash) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

function deleteExpiredSessions(db) {
  db.prepare('DELETE FROM sessions WHERE datetime(expires_at) <= datetime(\'now\')').run();
}

module.exports = {
  createSession,
  getSessionByTokenHash,
  deleteSessionByTokenHash,
  deleteExpiredSessions,
};
