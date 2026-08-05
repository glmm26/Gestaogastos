function mapInvestment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    monthlyAmount: row.monthly_amount,
    riskProfile: row.risk_profile,
    years: row.years,
    date: row.date,
    createdAt: row.created_at,
  };
}

function listInvestmentsByUser(db, userId) {
  return db
    .prepare('SELECT * FROM investments WHERE user_id = ? ORDER BY date(date) DESC, id DESC')
    .all(userId)
    .map(mapInvestment);
}

function getInvestmentByIdAndUser(db, id, userId) {
  const row = db.prepare('SELECT * FROM investments WHERE id = ? AND user_id = ?').get(id, userId);
  return mapInvestment(row);
}

function createInvestment(db, { userId, monthlyAmount, riskProfile, years, date }) {
  const result = db
    .prepare('INSERT INTO investments (user_id, monthly_amount, risk_profile, years, date) VALUES (?, ?, ?, ?, ?)')
    .run(userId, monthlyAmount, riskProfile, years, date);
  return getInvestmentByIdAndUser(db, result.lastInsertRowid, userId);
}

function updateInvestment(db, id, userId, { monthlyAmount, riskProfile, years }) {
  db.prepare(
    'UPDATE investments SET monthly_amount = ?, risk_profile = ?, years = ? WHERE id = ? AND user_id = ?'
  ).run(monthlyAmount, riskProfile, years, id, userId);
  return getInvestmentByIdAndUser(db, id, userId);
}

function deleteInvestment(db, id, userId) {
  const result = db.prepare('DELETE FROM investments WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

module.exports = {
  listInvestmentsByUser,
  getInvestmentByIdAndUser,
  createInvestment,
  updateInvestment,
  deleteInvestment,
};
