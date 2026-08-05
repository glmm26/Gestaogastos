function mapReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    month: row.month,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getReportByUserAndMonth(db, userId, month) {
  const row = db.prepare('SELECT * FROM reports WHERE user_id = ? AND month = ?').get(userId, month);
  return mapReport(row);
}

function listReportsByUser(db, userId) {
  return db
    .prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY month DESC')
    .all(userId)
    .map(mapReport);
}

function upsertReport(db, { userId, month, payload }) {
  const existing = getReportByUserAndMonth(db, userId, month);
  const payloadJson = JSON.stringify(payload);

  if (existing) {
    db.prepare(
      `UPDATE reports SET payload = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
    ).run(payloadJson, existing.id);
    return getReportByUserAndMonth(db, userId, month);
  }

  db.prepare('INSERT INTO reports (user_id, month, payload) VALUES (?, ?, ?)').run(userId, month, payloadJson);
  return getReportByUserAndMonth(db, userId, month);
}

module.exports = {
  getReportByUserAndMonth,
  listReportsByUser,
  upsertReport,
};
