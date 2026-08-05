function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatDateBR(value) {
  if (!value) return '--';
  const { normalizeDate } = require('./validation');
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${normalizeDate(value)}T00:00:00`));
}

function formatDateTimeBR(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeBase64Image(value) {
  const normalized = String(value || '').trim();
  return /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(normalized) ? normalized : '';
}

module.exports = {
  formatMonthLabel,
  formatCurrencyBRL,
  formatDateBR,
  formatDateTimeBR,
  escapeHtml,
  sanitizeBase64Image,
};
