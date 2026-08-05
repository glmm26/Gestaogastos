const { sendJson, parseBody } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const { normalizeDate, normalizeRiskProfile } = require('../lib/validation');
const { getRiskProfileConfig, hydrateInvestment, buildInvestmentSummary, buildInvestmentEvolution } = require('../lib/analytics');
const { refreshAutomaticReports } = require('../lib/reports');
const investmentsRepo = require('../db/repositories/investments');

function validateInvestmentInput({ monthlyAmount, years }) {
  const numericAmount = Number(monthlyAmount);
  const numericYears = Number.parseInt(years, 10);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: 'Informe um valor mensal válido.' };
  }
  if (!Number.isFinite(numericYears) || numericYears <= 0) {
    return { error: 'Escolha um tempo de investimento válido.' };
  }

  return { monthlyAmount: Number(numericAmount.toFixed(2)), years: numericYears };
}

async function handle({ req, res, db, method, route, parsedUrl, investmentMatch }) {
  if (method === 'POST' && route === '/api/investments') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { monthlyAmount, riskProfile, years } = await parseBody(req);
    const validated = validateInvestmentInput({ monthlyAmount, years });
    if (validated.error) {
      sendJson(res, 400, { message: validated.error });
      return true;
    }

    const normalizedRiskProfile = normalizeRiskProfile(riskProfile);
    investmentsRepo.createInvestment(db, {
      userId: user.id,
      monthlyAmount: validated.monthlyAmount,
      riskProfile: normalizedRiskProfile,
      years: validated.years,
      date: normalizeDate(new Date().toISOString()),
    });

    refreshAutomaticReports(db, user.id);
    const profile = getRiskProfileConfig(normalizedRiskProfile);
    sendJson(res, 201, {
      message: `Simulação salva com sucesso. Perfil ${profile.label.toLowerCase()} com ${profile.annualRate}% ao ano.`,
    });
    return true;
  }

  if (method === 'GET' && route === '/api/investments') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const investments = investmentsRepo.listInvestmentsByUser(db, user.id).map(hydrateInvestment);

    refreshAutomaticReports(db, user.id);
    sendJson(res, 200, {
      summary: buildInvestmentSummary(investments),
      evolution: buildInvestmentEvolution(investments),
      investments,
    });
    return true;
  }

  if ((method === 'PUT' || method === 'DELETE') && investmentMatch) {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const investmentId = Number(investmentMatch[1]);
    const existing = investmentsRepo.getInvestmentByIdAndUser(db, investmentId, user.id);
    if (!existing) {
      sendJson(res, 404, { message: 'Investimento não encontrado.' });
      return true;
    }

    if (method === 'DELETE') {
      investmentsRepo.deleteInvestment(db, investmentId, user.id);
      refreshAutomaticReports(db, user.id);
      sendJson(res, 200, { message: 'Investimento excluído com sucesso.' });
      return true;
    }

    const data = await parseBody(req);
    const validated = validateInvestmentInput({ monthlyAmount: data.monthlyAmount, years: data.years });
    if (validated.error) {
      sendJson(res, 400, { message: validated.error });
      return true;
    }

    investmentsRepo.updateInvestment(db, investmentId, user.id, {
      monthlyAmount: validated.monthlyAmount,
      riskProfile: normalizeRiskProfile(data.riskProfile),
      years: validated.years,
    });

    refreshAutomaticReports(db, user.id);
    sendJson(res, 200, { message: 'Simulação atualizada com sucesso.' });
    return true;
  }

  return false;
}

module.exports = { handle };
