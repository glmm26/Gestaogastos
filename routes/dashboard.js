const { sendJson } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const { normalizeMonthKey } = require('../lib/validation');
const {
  filterTransactions,
  buildTransactionSummary,
  buildCategoryBreakdown,
  buildTransactionSeries,
  buildMonthlySeries,
} = require('../lib/analytics');
const { formatMonthLabel: formatLabel } = require('../lib/format');
const { refreshAutomaticReports } = require('../lib/reports');
const transactionsRepo = require('../db/repositories/transactions');

function getDashboardPayload(db, userId, selectedMonth) {
  const currentMonth = normalizeMonthKey(selectedMonth);
  const allTransactions = transactionsRepo.listTransactionsByUser(db, userId);
  const monthTransactions = filterTransactions(allTransactions, { month: currentMonth });
  const [year, month] = currentMonth.split('-').map(Number);
  const previousDate = new Date(Date.UTC(year, month - 2, 1));
  const previousMonthKey = `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const previousMonthTransactions = filterTransactions(allTransactions, { month: previousMonthKey });
  const currentSummary = buildTransactionSummary(monthTransactions);
  const previousSummary = buildTransactionSummary(previousMonthTransactions);
  const latestTransactions = monthTransactions.slice(0, 5);
  let insight = 'Seu mês começou equilibrado. Continue registrando suas movimentações.';

  if (currentSummary.expense > previousSummary.expense && previousSummary.expense > 0) {
    insight = 'Você gastou mais que no mês passado. Vale revisar as categorias com maior saída.';
  } else if (currentSummary.expense < previousSummary.expense && previousSummary.expense > 0) {
    insight = 'Você gastou menos que no mês passado. Ótimo sinal de controle financeiro.';
  } else if (currentSummary.balance > 0) {
    insight = 'Seu saldo está positivo neste mês. Considere separar parte dele para sua reserva.';
  }

  return {
    month: currentMonth,
    label: formatLabel(currentMonth),
    summary: currentSummary,
    latestTransactions,
    categoryBreakdown: buildCategoryBreakdown(monthTransactions),
    transactionSeries: buildTransactionSeries(monthTransactions),
    monthlySeries: buildMonthlySeries(monthTransactions).slice(-6),
    welcome: {
      totalExpenses: currentSummary.expense,
      insight,
    },
  };
}

async function handle({ req, res, db, method, route, parsedUrl }) {
  if (method === 'GET' && route === '/api/dashboard') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    refreshAutomaticReports(db, user.id);
    sendJson(res, 200, getDashboardPayload(db, user.id, parsedUrl.searchParams.get('month')));
    return true;
  }

  return false;
}

module.exports = { handle };
