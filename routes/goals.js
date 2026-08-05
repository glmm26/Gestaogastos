const { sendJson, parseBody } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const { normalizeText, normalizeDate, normalizeCategoryName, normalizeGoalStatus } = require('../lib/validation');
const { buildGoalsSummary } = require('../lib/analytics');
const goalsRepo = require('../db/repositories/goals');

function validateGoalInput({ name, targetAmount, currentAmount }) {
  const numericTarget = Number(targetAmount);
  const numericCurrent = Number(currentAmount || 0);

  if (!normalizeText(name)) {
    return { error: 'Informe um nome para a meta.' };
  }
  if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
    return { error: 'Informe um valor alvo válido.' };
  }
  if (!Number.isFinite(numericCurrent) || numericCurrent < 0) {
    return { error: 'Informe um valor atual válido.' };
  }

  return {
    name: normalizeText(name).slice(0, 80),
    targetAmount: Number(numericTarget.toFixed(2)),
    currentAmount: Number(numericCurrent.toFixed(2)),
  };
}

async function handle({ req, res, db, method, route, parsedUrl, goalMatch }) {
  if (method === 'POST' && route === '/api/goals') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { name, targetAmount, currentAmount, deadline, category } = await parseBody(req);
    const validated = validateGoalInput({ name, targetAmount, currentAmount });
    if (validated.error) {
      sendJson(res, 400, { message: validated.error });
      return true;
    }

    goalsRepo.createGoal(db, {
      userId: user.id,
      name: validated.name,
      targetAmount: validated.targetAmount,
      currentAmount: validated.currentAmount,
      deadline: normalizeDate(deadline),
      categoryName: normalizeCategoryName(category || ''),
    });

    sendJson(res, 201, { message: 'Meta criada com sucesso.' });
    return true;
  }

  if (method === 'GET' && route === '/api/goals') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const status = parsedUrl.searchParams.get('status') || 'all';
    const goals = goalsRepo.listGoalsByUser(db, user.id, status);
    const allGoals = status === 'all' ? goals : goalsRepo.listGoalsByUser(db, user.id, 'all');

    sendJson(res, 200, {
      summary: buildGoalsSummary(allGoals),
      goals,
    });
    return true;
  }

  if ((method === 'PUT' || method === 'DELETE') && goalMatch) {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const goalId = Number(goalMatch[1]);
    const existing = goalsRepo.getGoalByIdAndUser(db, goalId, user.id);
    if (!existing) {
      sendJson(res, 404, { message: 'Meta não encontrada.' });
      return true;
    }

    if (method === 'DELETE') {
      goalsRepo.deleteGoal(db, goalId, user.id);
      sendJson(res, 200, { message: 'Meta removida com sucesso.' });
      return true;
    }

    const data = await parseBody(req);
    const nextTarget = data.targetAmount !== undefined ? Number(data.targetAmount) : existing.targetAmount;
    const nextCurrent = data.currentAmount !== undefined ? Number(data.currentAmount) : existing.currentAmount;

    if (!normalizeText(data.name ?? existing.name)) {
      sendJson(res, 400, { message: 'Informe um nome válido para a meta.' });
      return true;
    }
    if (!Number.isFinite(nextTarget) || nextTarget <= 0) {
      sendJson(res, 400, { message: 'Informe um valor alvo válido.' });
      return true;
    }
    if (!Number.isFinite(nextCurrent) || nextCurrent < 0) {
      sendJson(res, 400, { message: 'Informe um valor atual válido.' });
      return true;
    }

    const updated = goalsRepo.updateGoal(db, goalId, user.id, {
      name: normalizeText(data.name ?? existing.name),
      targetAmount: Number(nextTarget.toFixed(2)),
      currentAmount: Number(nextCurrent.toFixed(2)),
      deadline: normalizeDate(data.deadline ?? existing.deadline),
      categoryName: normalizeCategoryName(data.category ?? existing.category),
      status: normalizeGoalStatus(data.status ?? existing.status),
    });

    sendJson(res, 200, { message: 'Meta atualizada com sucesso.', goal: updated });
    return true;
  }

  return false;
}

module.exports = { handle };
