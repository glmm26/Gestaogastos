function mapOtp(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    code: row.code,
    userId: row.user_id,
    pendingUserId: row.pending_user_id,
    expiresAt: row.expires_at,
    used: Boolean(row.used),
    createdAt: row.created_at,
  };
}

function getLatestOtpForEmail(db, email) {
  const row = db
    .prepare('SELECT * FROM otps WHERE email = ? ORDER BY datetime(created_at) DESC LIMIT 1')
    .get(email);
  return mapOtp(row);
}

function invalidatePendingOtps(db, email) {
  db.prepare('UPDATE otps SET used = 1 WHERE email = ? AND used = 0').run(email);
}

function createOtp(db, { email, code, userId, pendingUserId, expiresAt }) {
  db.prepare(
    'INSERT INTO otps (email, code, user_id, pending_user_id, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(email, code, userId || null, pendingUserId || null, expiresAt);
}

function markOtpUsed(db, id) {
  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(id);
}

module.exports = {
  getLatestOtpForEmail,
  invalidatePendingOtps,
  createOtp,
  markOtpUsed,
};
