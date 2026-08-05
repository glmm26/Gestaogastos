function mapPendingUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPendingUserByEmail(db, email) {
  const row = db.prepare('SELECT * FROM pending_users WHERE email = ?').get(email);
  return mapPendingUser(row);
}

function upsertPendingUser(db, { email, name, passwordHash }) {
  const now = new Date().toISOString();
  const existing = getPendingUserByEmail(db, email);

  if (existing) {
    db.prepare('UPDATE pending_users SET name = ?, password_hash = ?, updated_at = ? WHERE id = ?').run(
      name,
      passwordHash,
      now,
      existing.id
    );
    return getPendingUserByEmail(db, email);
  }

  db.prepare('INSERT INTO pending_users (email, name, password_hash, updated_at) VALUES (?, ?, ?, ?)').run(
    email,
    name,
    passwordHash,
    now
  );
  return getPendingUserByEmail(db, email);
}

function deletePendingUser(db, id) {
  db.prepare('DELETE FROM pending_users WHERE id = ?').run(id);
}

module.exports = {
  getPendingUserByEmail,
  upsertPendingUser,
  deletePendingUser,
};
