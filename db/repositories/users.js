function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    photo: row.photo_path || '',
    photoUpdatedAt: row.photo_updated_at,
    isVerified: Boolean(row.is_verified),
    createdAt: row.created_at,
  };
}

function getUserByEmail(db, email) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return mapUser(row);
}

function getUserById(db, id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return mapUser(row);
}

function createUser(db, { email, name, passwordHash, isVerified = false }) {
  const result = db
    .prepare('INSERT INTO users (email, name, password_hash, is_verified) VALUES (?, ?, ?, ?)')
    .run(email, name, passwordHash, isVerified ? 1 : 0);
  return getUserById(db, result.lastInsertRowid);
}

function markUserVerified(db, id) {
  db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(id);
}

function updateUserName(db, id, name) {
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
}

function updateUserPassword(db, id, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

function updateUserPhoto(db, id, photoPath, photoUpdatedAt) {
  db.prepare('UPDATE users SET photo_path = ?, photo_updated_at = ? WHERE id = ?').run(
    photoPath || null,
    photoUpdatedAt,
    id
  );
}

function updateUserNameAndPassword(db, id, { name, passwordHash }) {
  db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(name, passwordHash, id);
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  markUserVerified,
  updateUserName,
  updateUserPassword,
  updateUserPhoto,
  updateUserNameAndPassword,
};
