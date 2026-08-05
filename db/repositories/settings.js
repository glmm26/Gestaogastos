function mapSettings(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    currency: row.currency,
    theme: row.theme,
    notifyByEmail: Boolean(row.notify_by_email),
  };
}

function getSettingsByUser(db, userId) {
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
    return getSettingsByUser(db, userId);
  }
  return mapSettings(row);
}

function updateSettings(db, userId, { currency, theme, notifyByEmail }) {
  getSettingsByUser(db, userId);
  db.prepare('UPDATE user_settings SET currency = ?, theme = ?, notify_by_email = ? WHERE user_id = ?').run(
    currency,
    theme,
    notifyByEmail ? 1 : 0,
    userId
  );
  return getSettingsByUser(db, userId);
}

module.exports = {
  getSettingsByUser,
  updateSettings,
};
