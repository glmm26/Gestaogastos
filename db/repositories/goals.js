function mapGoal(row) {
  if (!row) return null;
  const targetAmount = row.target_amount;
  const currentAmount = row.current_amount;
  const progress = Math.min(100, Number(((currentAmount / targetAmount) * 100).toFixed(1)));
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount,
    currentAmount,
    deadline: row.deadline,
    category: row.category_name,
    status: row.status,
    progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listGoalsByUser(db, userId, status = 'all') {
  const rows =
    status && status !== 'all'
      ? db
          .prepare('SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY date(deadline) ASC')
          .all(userId, status)
      : db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY date(deadline) ASC').all(userId);
  return rows.map(mapGoal);
}

function getGoalByIdAndUser(db, id, userId) {
  const row = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId);
  return mapGoal(row);
}

function createGoal(db, { userId, name, targetAmount, currentAmount, deadline, categoryName }) {
  const result = db
    .prepare(
      'INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, category_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(userId, name, targetAmount, currentAmount, deadline, categoryName, 'active');
  return getGoalByIdAndUser(db, result.lastInsertRowid, userId);
}

function updateGoal(db, id, userId, { name, targetAmount, currentAmount, deadline, categoryName, status }) {
  db.prepare(
    `UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ?, category_name = ?, status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ? AND user_id = ?`
  ).run(name, targetAmount, currentAmount, deadline, categoryName, status, id, userId);
  return getGoalByIdAndUser(db, id, userId);
}

function deleteGoal(db, id, userId) {
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

module.exports = {
  listGoalsByUser,
  getGoalByIdAndUser,
  createGoal,
  updateGoal,
  deleteGoal,
};
