const { sendJson, parseBody } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const { normalizeText, normalizeDate, normalizeCategoryName } = require('../lib/validation');
const { filterTransactions, buildTransactionSummary, buildCategoryBreakdown, buildMonthlySeries } = require('../lib/analytics');
const { refreshAutomaticReports } = require('../lib/reports');
const transactionsRepo = require('../db/repositories/transactions');
const categoriesRepo = require('../db/repositories/categories');

function validateTransactionInput({ type, amount }) {
  const normalizedType = normalizeText(type).toLowerCase();
  const numericAmount = Number(amount);

  if (!['income', 'expense'].includes(normalizedType)) {
    return { error: 'Tipo inválido.' };
  }
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: 'Valor inválido.' };
  }

  return { type: normalizedType, amount: Number(numericAmount.toFixed(2)) };
}

async function handle({ req, res, db, method, route, parsedUrl, transactionMatch }) {
  if (method === 'POST' && route === '/api/transactions') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { type, amount, category, date, notes } = await parseBody(req);
    const validated = validateTransactionInput({ type, amount });
    if (validated.error) {
      sendJson(res, 400, { message: validated.error });
      return true;
    }

    const normalizedCategory = categoriesRepo.ensureCategory(db, user.id, normalizeCategoryName(category || 'Outros'));
    const categoryId = categoriesRepo.getCategoryIdByName(db, user.id, normalizedCategory);

    transactionsRepo.createTransaction(db, {
      userId: user.id,
      categoryId,
      type: validated.type,
      amount: validated.amount,
      notes: normalizeText(notes).slice(0, 160),
      date: normalizeDate(date),
    });

    refreshAutomaticReports(db, user.id);
    sendJson(res, 201, { message: 'Movimentação adicionada com sucesso.' });
    return true;
  }

  if (method === 'GET' && route === '/api/transactions') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const filters = {
      type: parsedUrl.searchParams.get('type'),
      category: parsedUrl.searchParams.get('category'),
      period: parsedUrl.searchParams.get('period'),
      startDate: parsedUrl.searchParams.get('startDate'),
      endDate: parsedUrl.searchParams.get('endDate'),
      month: parsedUrl.searchParams.get('month'),
    };

    const allTransactions = transactionsRepo.listTransactionsByUser(db, user.id);
    const filteredTransactions = filterTransactions(allTransactions, filters);

    sendJson(res, 200, {
      summary: buildTransactionSummary(filteredTransactions),
      totalCount: filteredTransactions.length,
      transactions: filteredTransactions.slice(0, 100),
      categoryBreakdown: buildCategoryBreakdown(filteredTransactions),
      monthlySeries: buildMonthlySeries(allTransactions).slice(-6),
    });
    return true;
  }

  if ((method === 'PUT' || method === 'DELETE') && transactionMatch) {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const transactionId = Number(transactionMatch[1]);
    const existing = transactionsRepo.getTransactionByIdAndUser(db, transactionId, user.id);
    if (!existing) {
      sendJson(res, 404, { message: 'Movimentação não encontrada.' });
      return true;
    }

    if (method === 'DELETE') {
      transactionsRepo.deleteTransaction(db, transactionId, user.id);
      refreshAutomaticReports(db, user.id);
      sendJson(res, 200, { message: 'Movimentação excluída com sucesso.' });
      return true;
    }

    const { type, amount, category, date, notes } = await parseBody(req);
    const validated = validateTransactionInput({ type, amount });
    if (validated.error) {
      sendJson(res, 400, { message: validated.error });
      return true;
    }

    const normalizedCategory = categoriesRepo.ensureCategory(db, user.id, normalizeCategoryName(category || 'Outros'));
    const categoryId = categoriesRepo.getCategoryIdByName(db, user.id, normalizedCategory);

    transactionsRepo.updateTransaction(db, transactionId, user.id, {
      categoryId,
      type: validated.type,
      amount: validated.amount,
      notes: normalizeText(notes).slice(0, 160),
      date: normalizeDate(date),
    });

    refreshAutomaticReports(db, user.id);
    sendJson(res, 200, { message: 'Movimentação atualizada com sucesso.' });
    return true;
  }

  return false;
}

module.exports = { handle };
