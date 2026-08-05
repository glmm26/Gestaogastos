function getDefaultCategoryNames(db) {
  return db
    .prepare('SELECT name FROM categories WHERE user_id IS NULL ORDER BY id ASC')
    .all()
    .map((row) => row.name);
}

function isDefaultCategory(db, name) {
  const row = db.prepare('SELECT 1 FROM categories WHERE user_id IS NULL AND name = ?').get(name);
  return Boolean(row);
}

function getUserCategories(db, userId) {
  const defaults = getDefaultCategoryNames(db);
  const custom = db
    .prepare('SELECT name FROM categories WHERE user_id = ? ORDER BY id ASC')
    .all(userId)
    .map((row) => row.name)
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...custom]));
}

function findUserCategoryByName(db, userId, name) {
  return db
    .prepare('SELECT * FROM categories WHERE user_id = ? AND name = ? COLLATE NOCASE')
    .get(userId, name);
}

function ensureCategory(db, userId, normalizedName) {
  if (!normalizedName) return 'Outros';
  if (isDefaultCategory(db, normalizedName)) return normalizedName;

  const exists = findUserCategoryByName(db, userId, normalizedName);
  if (!exists) {
    db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)').run(userId, normalizedName);
  }

  return normalizedName;
}

function getCategoryIdByName(db, userId, name) {
  const custom = findUserCategoryByName(db, userId, name);
  if (custom) return custom.id;

  const defaultCategory = db
    .prepare('SELECT id FROM categories WHERE user_id IS NULL AND name = ?')
    .get(name);
  return defaultCategory ? defaultCategory.id : null;
}

function getCategoryNameById(db, id) {
  const row = db.prepare('SELECT name FROM categories WHERE id = ?').get(id);
  return row ? row.name : 'Outros';
}

module.exports = {
  getUserCategories,
  ensureCategory,
  getCategoryIdByName,
  getCategoryNameById,
};
