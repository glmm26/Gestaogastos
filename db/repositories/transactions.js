const SELECT_BASE = `
  SELECT t.id, t.user_id, t.type, t.amount, t.notes, t.date, t.created_at, c.name AS category
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

function mapTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: row.amount,
    category: row.category,
    notes: row.notes,
    date: row.date,
    createdAt: row.created_at,
  };
}

function listTransactionsByUser(db, userId) {
  return db
    .prepare(`${SELECT_BASE} WHERE t.user_id = ? ORDER BY date(t.date) DESC, t.id DESC`)
    .all(userId)
    .map(mapTransaction);
}

function getTransactionByIdAndUser(db, id, userId) {
  const row = db.prepare(`${SELECT_BASE} WHERE t.id = ? AND t.user_id = ?`).get(id, userId);
  return mapTransaction(row);
}

function createTransaction(db, { userId, categoryId, type, amount, notes, date }) {
  const result = db
    .prepare('INSERT INTO transactions (user_id, category_id, type, amount, notes, date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, categoryId, type, amount, notes, date);
  return result.lastInsertRowid;
}

function updateTransaction(db, id, userId, { categoryId, type, amount, notes, date }) {
  db.prepare(
    'UPDATE transactions SET category_id = ?, type = ?, amount = ?, notes = ?, date = ? WHERE id = ? AND user_id = ?'
  ).run(categoryId, type, amount, notes, date, id, userId);
}

function deleteTransaction(db, id, userId) {
  const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

module.exports = {
  listTransactionsByUser,
  getTransactionByIdAndUser,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
