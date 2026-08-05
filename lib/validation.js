function normalizeText(value, fallback = '') {
  return String(value || '').trim() || fallback;
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function normalizeUserName(value, fallback = 'Usuario') {
  return normalizeText(value, fallback)
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function normalizeCategoryName(value) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

function normalizePhotoPath(value) {
  const normalized = normalizeText(value);
  return normalized.startsWith('/uploads/') ? normalized : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function validatePasswordStrength(password) {
  return String(password || '').length >= 6;
}

function normalizeDate(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function getMonthKey(dateValue) {
  return normalizeDate(dateValue).slice(0, 7);
}

function normalizeMonthKey(value) {
  const monthKey = normalizeText(value);
  return /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : new Date().toISOString().slice(0, 7);
}

function normalizeRiskProfile(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return 'medium';
}

function normalizeGoalStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'completed' || normalized === 'failed' || normalized === 'active') {
    return normalized;
  }
  return 'active';
}

module.exports = {
  normalizeText,
  normalizeEmail,
  normalizeUserName,
  normalizeCategoryName,
  normalizePhotoPath,
  isValidEmail,
  validatePasswordStrength,
  normalizeDate,
  getMonthKey,
  normalizeMonthKey,
  normalizeRiskProfile,
  normalizeGoalStatus,
};
