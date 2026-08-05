const { normalizeDate, getMonthKey } = require('./validation');
const { formatMonthLabel } = require('./format');

const PERFIS_RISCO_INVESTIMENTO = {
  low: { label: 'Baixo risco', annualRate: 8 },
  medium: { label: 'Medio risco', annualRate: 12 },
  high: { label: 'Alto risco', annualRate: 18 },
};

function getRiskProfileConfig(profile) {
  return PERFIS_RISCO_INVESTIMENTO[profile] || PERFIS_RISCO_INVESTIMENTO.medium;
}

function getRiskProfileLabel(profile) {
  return getRiskProfileConfig(profile).label;
}

function getAnnualRate(profile) {
  return getRiskProfileConfig(profile).annualRate;
}

function simulateInvestmentGrowth(monthlyAmount, annualRate, years) {
  const validMonthlyAmount = Number(monthlyAmount) > 0 ? Number(monthlyAmount) : 0;
  const validYears = Number(years) > 0 ? Number(years) : 1;
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const totalMonths = validYears * 12;
  let accumulated = 0;
  const yearlyPoints = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    accumulated = (accumulated + validMonthlyAmount) * (1 + monthlyRate);
    if (month % 12 === 0 || month === totalMonths) {
      yearlyPoints.push({
        year: Math.ceil(month / 12),
        value: Number(accumulated.toFixed(2)),
      });
    }
  }

  const totalContributed = Number((validMonthlyAmount * totalMonths).toFixed(2));
  const projectedValue = Number(accumulated.toFixed(2));
  const estimatedGain = Number((projectedValue - totalContributed).toFixed(2));

  return {
    totalMonths,
    totalContributed,
    projectedValue,
    estimatedGain,
    yearlyPoints,
  };
}

function matchesPeriod(dateValue, period, startDate, endDate) {
  const time = new Date(`${normalizeDate(dateValue)}T00:00:00Z`).getTime();
  if (Number.isNaN(time)) return false;

  if (startDate) {
    const start = new Date(`${normalizeDate(startDate)}T00:00:00Z`).getTime();
    if (time < start) return false;
  }

  if (endDate) {
    const end = new Date(`${normalizeDate(endDate)}T23:59:59Z`).getTime();
    if (time > end) return false;
  }

  if (!period || period === 'all') return true;

  const today = new Date();
  const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).getTime();

  if (period === 'month') {
    const currentMonth = new Date();
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return normalizeDate(dateValue).startsWith(`${year}-${month}`);
  }

  const days = Number(String(period).replace(/\D/g, ''));
  if (!Number.isFinite(days) || days <= 0) return true;

  const diff = current - time;
  return diff <= days * 24 * 60 * 60 * 1000;
}

function filterTransactions(transactions, filters = {}) {
  const { type, category, period, startDate, endDate, month } = filters;
  return transactions
    .filter((entry) => {
      if (type && type !== 'all' && entry.type !== type) return false;
      if (category && category !== 'all' && entry.category !== category) return false;
      if (month && month !== 'all' && getMonthKey(entry.date) !== month) return false;
      return matchesPeriod(entry.date, period, startDate, endDate);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildTransactionSummary(transactions) {
  const income = transactions
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expense = transactions
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    income: Number(income.toFixed(2)),
    expense: Number(expense.toFixed(2)),
    balance: Number((income - expense).toFixed(2)),
  };
}

function buildCategoryBreakdown(transactions) {
  const expenseTransactions = transactions.filter((entry) => entry.type === 'expense');
  const totalExpense = expenseTransactions.reduce((sum, entry) => sum + entry.amount, 0);

  return Array.from(
    expenseTransactions.reduce((map, entry) => {
      const current = map.get(entry.category) || 0;
      map.set(entry.category, current + entry.amount);
      return map;
    }, new Map())
  )
    .map(([category, total]) => ({
      category,
      total: Number(total.toFixed(2)),
      percentage: totalExpense ? Number(((total / totalExpense) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function buildMonthlySeries(transactions) {
  const buckets = new Map();

  transactions.forEach((entry) => {
    const month = getMonthKey(entry.date);
    if (!buckets.has(month)) {
      buckets.set(month, { month, income: 0, expense: 0 });
    }
    const bucket = buckets.get(month);
    bucket[entry.type] += entry.amount;
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((entry) => ({
      month: entry.month,
      label: formatMonthLabel(entry.month),
      income: Number(entry.income.toFixed(2)),
      expense: Number(entry.expense.toFixed(2)),
    }));
}

function buildTransactionSeries(transactions) {
  return transactions
    .slice()
    .sort((a, b) => {
      const dateDiff = Date.parse(`${a.date}T00:00:00Z`) - Date.parse(`${b.date}T00:00:00Z`);
      if (dateDiff !== 0) return dateDiff;

      const createdAtDiff = Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0);
      if (createdAtDiff !== 0) return createdAtDiff;

      return a.id - b.id;
    })
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: Number(entry.amount.toFixed(2)),
      category: entry.category,
      notes: entry.notes,
      date: entry.date,
    }));
}

function hydrateInvestment(investment) {
  const riskProfile = investment.riskProfile;
  const annualRate = getAnnualRate(riskProfile);
  const projection = simulateInvestmentGrowth(investment.monthlyAmount, annualRate, investment.years);

  return {
    id: investment.id,
    userId: investment.userId,
    monthlyAmount: investment.monthlyAmount,
    riskProfile,
    riskLabel: getRiskProfileLabel(riskProfile),
    annualRate,
    years: investment.years,
    totalContributed: projection.totalContributed,
    projectedValue: projection.projectedValue,
    estimatedGain: projection.estimatedGain,
    yearlyPoints: projection.yearlyPoints,
    date: investment.date,
    createdAt: investment.createdAt,
  };
}

function buildInvestmentSummary(investments) {
  const totalInvested = investments.reduce((sum, entry) => sum + entry.totalContributed, 0);
  const profitLoss = investments.reduce((sum, entry) => sum + entry.estimatedGain, 0);

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    profitLoss: Number(profitLoss.toFixed(2)),
    currentValue: Number((totalInvested + profitLoss).toFixed(2)),
  };
}

function buildInvestmentEvolution(investments) {
  const maxYears = Math.max(0, ...investments.map((entry) => entry.years || 0));
  if (!maxYears) return [];

  const points = [];
  for (let year = 1; year <= maxYears; year += 1) {
    const currentValue = investments.reduce((sum, entry) => {
      const point = entry.yearlyPoints.find((item) => item.year === year);
      const fallback = entry.yearlyPoints[entry.yearlyPoints.length - 1];
      if (!point && (!fallback || year > entry.years)) return sum;
      return sum + (point ? point.value : fallback.value);
    }, 0);

    points.push({
      label: `${year} ano${year > 1 ? 's' : ''}`,
      currentValue: Number(currentValue.toFixed(2)),
    });
  }

  return points;
}

function buildInsights(summary, categoryBreakdown, investmentsSummary) {
  const insights = [];
  const topCategory = categoryBreakdown[0];

  if (summary.expense > summary.income) {
    insights.push('Suas saídas estão maiores que as entradas no período selecionado.');
  }

  if (topCategory && topCategory.category === 'Alimentacao' && topCategory.percentage >= 30) {
    insights.push('Seus gastos com alimentacao estao altos e ja representam boa parte das despesas.');
  }

  if (topCategory && topCategory.percentage >= 40) {
    insights.push(`A categoria ${topCategory.category} concentra a maior parte dos gastos. Vale revisar esse grupo.`);
  }

  if (summary.balance > 0) {
    insights.push('Seu saldo esta positivo. Considere direcionar parte do excedente para reserva ou investimento.');
  }

  if (investmentsSummary.totalInvested > 0 && investmentsSummary.currentValue > investmentsSummary.totalInvested) {
    insights.push('Investindo aos poucos, seu dinheiro pode crescer ao longo do tempo.');
  }

  if (!insights.length) {
    insights.push('Seu fluxo financeiro está equilibrado no período analisado.');
  }

  return insights.slice(0, 4);
}

function buildGoalsSummary(goals) {
  return {
    total: goals.length,
    active: goals.filter((goal) => goal.status === 'active').length,
    completed: goals.filter((goal) => goal.status === 'completed').length,
    failed: goals.filter((goal) => goal.status === 'failed').length,
  };
}

module.exports = {
  PERFIS_RISCO_INVESTIMENTO,
  getRiskProfileConfig,
  getRiskProfileLabel,
  getAnnualRate,
  simulateInvestmentGrowth,
  matchesPeriod,
  filterTransactions,
  buildTransactionSummary,
  buildCategoryBreakdown,
  buildMonthlySeries,
  buildTransactionSeries,
  hydrateInvestment,
  buildInvestmentSummary,
  buildInvestmentEvolution,
  buildInsights,
  buildGoalsSummary,
};
