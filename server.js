const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureDatabase, readDatabase, writeDatabase } = require('./db');

loadDotenv(path.join(__dirname, '.env'));

const PORT = process.env.PORT || 3000;
const OTP_EXPIRATION_MINUTES = 5;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DEFAULT_CATEGORIES = ['Salario', 'Alimentacao', 'Transporte', 'Lazer', 'Moradia', 'Outros'];
const INVESTMENT_RISK_PROFILES = {
  low: { label: 'Baixo risco', annualRate: 8 },
  medium: { label: 'Medio risco', annualRate: 12 },
  high: { label: 'Alto risco', annualRate: 18 },
};
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || 'api').trim().toLowerCase();
const EMAIL_API_URL = String(process.env.EMAIL_API_URL || 'https://api.brevo.com/v3/smtp/email').trim();
const EMAIL_API_KEY = String(process.env.EMAIL_API_KEY || '').trim();
const EMAIL_API_SENDER_EMAIL = String(process.env.EMAIL_API_SENDER_EMAIL || '').trim();
const EMAIL_API_SENDER_NAME = String(process.env.EMAIL_API_SENDER_NAME || 'Gestão de Gastos').trim();

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) return;

    value = value.replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendPdf(res, status, pdfBuffer, filename = 'relatorio.pdf') {
  res.writeHead(status, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Content-Length': pdfBuffer.length,
    'Cache-Control': 'no-store',
  });
  res.end(pdfBuffer);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isEmailApiConfigured() {
  return (
    EMAIL_PROVIDER === 'api' &&
    EMAIL_API_URL &&
    EMAIL_API_KEY &&
    EMAIL_API_SENDER_EMAIL &&
    !EMAIL_API_KEY.includes('COLOQUE_SUA_CHAVE_BREVO_AQUI')
  );
}

async function sendOtpEmail(targetEmail, otp) {
  if (!isEmailApiConfigured()) {
    throw new Error('Serviço de email não configurado.');
  }

  const payload = {
    sender: {
      name: EMAIL_API_SENDER_NAME,
      email: EMAIL_API_SENDER_EMAIL,
    },
    to: [{ email: targetEmail }],
    subject: 'Código de confirmação de cadastro - Gestão de Gastos',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Código de confirmação</h2>
          <p>Use o código abaixo para concluir seu cadastro:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>Esse código expira em ${OTP_EXPIRATION_MINUTES} minutos.</p>
        </body>
      </html>
    `,
  };

  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': EMAIL_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao enviar OTP por email (${response.status}): ${details}`);
  }
}

function isUserVerified(user) {
  return user?.isVerified !== false;
}

async function issueRegistrationOtp(db, user) {
  db.otps = db.otps.map((entry) =>
    entry.userId === user.id && entry.used === false ? { ...entry, used: true } : entry
  );

  const otp = generateOtp();
  db.otps.push({
    id: db.counters.otpId++,
    userId: user.id,
    code: otp,
    expiresAt: new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  });

  let emailSent = false;
  let deliveryWarning = '';

  try {
    await sendOtpEmail(user.email, otp);
    emailSent = true;
  } catch (error) {
    deliveryWarning = error.message;
    console.error(`Falha ao enviar OTP para ${user.email}: ${error.message}`);
  }

  console.log(`OTP para ${user.email}: ${otp}`);

  return {
    message: emailSent
      ? `Código de cadastro enviado para ${user.email}. Validade de ${OTP_EXPIRATION_MINUTES} minutos.`
      : 'Código de cadastro gerado. Como o envio por email não está disponível, use o código de desenvolvimento.',
    devOtp: emailSent ? undefined : otp,
    deliveryWarning: emailSent ? undefined : deliveryWarning,
  };
}

function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestedPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { message: 'Acesso negado.' });
    return;
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
  };

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fallback = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(fallback);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
    return;
  }

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
  res.end(content);
}

function normalizeText(value, fallback = '') {
  return String(value || '').trim() || fallback;
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function normalizeCategoryName(value) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .slice(0, 40);
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

function normalizeRiskProfile(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return 'medium';
}

function getRiskProfileConfig(profile) {
  return INVESTMENT_RISK_PROFILES[normalizeRiskProfile(profile)] || INVESTMENT_RISK_PROFILES.medium;
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

function getMonthKey(dateValue) {
  return normalizeDate(dateValue).slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function getUserByEmail(db, email) {
  const normalizedEmail = normalizeEmail(email);
  return db.users.find((entry) => entry.email === normalizedEmail);
}

function getUserCategories(db, userId) {
  const custom = db.customCategories
    .filter((entry) => entry.userId === userId)
    .map((entry) => entry.name)
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_CATEGORIES, ...custom]));
}

function ensureCategory(db, userId, category) {
  const normalized = normalizeCategoryName(category);
  if (!normalized || DEFAULT_CATEGORIES.includes(normalized)) {
    return normalized || 'Outros';
  }

  const exists = db.customCategories.find(
    (entry) => entry.userId === userId && entry.name.toLowerCase() === normalized.toLowerCase()
  );

  if (!exists) {
    db.customCategories.push({
      id: db.counters.categoryId++,
      userId,
      name: normalized,
      createdAt: new Date().toISOString(),
    });
  }

  return normalized;
}

function migrateTransactionCategory(transaction) {
  if (transaction.category) {
    return normalizeCategoryName(transaction.category) || 'Outros';
  }

  const description = normalizeText(transaction.description);
  if (!description) {
    return 'Outros';
  }

  const match = DEFAULT_CATEGORIES.find((category) => category.toLowerCase() === description.toLowerCase());
  return match || normalizeCategoryName(description) || 'Outros';
}

function normalizeTransaction(userId, transaction) {
  const createdAt = transaction.createdAt || new Date().toISOString();
  const date = normalizeDate(transaction.date || createdAt);
  return {
    id: transaction.id,
    userId,
    type: transaction.type === 'income' ? 'income' : 'expense',
    amount: Number(Number(transaction.amount || 0).toFixed(2)),
    category: migrateTransactionCategory(transaction),
    notes: normalizeText(transaction.notes || transaction.description || ''),
    date,
    createdAt,
  };
}

function normalizeInvestment(userId, investment) {
  const createdAt = investment.createdAt || new Date().toISOString();
  const riskProfile = normalizeRiskProfile(
    investment.riskProfile ||
      (Number(investment.profitability) >= 16 ? 'high' : Number(investment.profitability) >= 10 ? 'medium' : 'low')
  );
  const monthlyAmount = Number(Number(investment.monthlyAmount || investment.amount || 0).toFixed(2));
  const years = Math.max(1, Number.parseInt(investment.years || '1', 10) || 1);
  const annualRate = getAnnualRate(riskProfile);
  const projection = simulateInvestmentGrowth(monthlyAmount, annualRate, years);

  return {
    id: investment.id,
    userId,
    monthlyAmount,
    riskProfile,
    riskLabel: getRiskProfileLabel(riskProfile),
    annualRate,
    years,
    totalContributed: projection.totalContributed,
    projectedValue: projection.projectedValue,
    estimatedGain: projection.estimatedGain,
    yearlyPoints: projection.yearlyPoints,
    date: normalizeDate(investment.date || createdAt),
    createdAt,
  };
}

function normalizeGoalStatus(value) {
  const normalized = normalizeText(value, 'in_progress').toLowerCase();
  if (normalized === 'completed' || normalized === 'failed' || normalized === 'in_progress') {
    return normalized;
  }
  return 'in_progress';
}

function normalizeGoal(userId, goal) {
  const createdAt = goal.createdAt || new Date().toISOString();
  const targetAmount = Math.max(0.01, Number(Number(goal.targetAmount || 0).toFixed(2)) || 0.01);
  const currentAmount = Math.max(0, Number(Number(goal.currentAmount || 0).toFixed(2)) || 0);
  const progress = Math.min(100, Number(((currentAmount / targetAmount) * 100).toFixed(1)));
  return {
    id: goal.id,
    userId,
    name: normalizeText(goal.name, 'Meta financeira').slice(0, 80),
    targetAmount,
    currentAmount,
    progress,
    dueDate: normalizeDate(goal.dueDate || goal.date || createdAt),
    category: normalizeText(goal.category).slice(0, 40),
    status: normalizeGoalStatus(goal.status),
    createdAt,
    updatedAt: goal.updatedAt || createdAt,
  };
}

function hydrateDatabase(db) {
  db.transactions = db.transactions.map((entry) => normalizeTransaction(entry.userId, entry));
  db.investments = db.investments.map((entry) => normalizeInvestment(entry.userId, entry));
  db.goals = (db.goals || []).map((entry) => normalizeGoal(entry.userId, entry));

  db.transactions.forEach((entry) => {
    ensureCategory(db, entry.userId, entry.category);
  });
}

function buildGoalsPayload(goals, filter = 'all') {
  const filteredGoals = goals
    .filter((entry) => (filter && filter !== 'all' ? entry.status === filter : true))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return {
    filter: filter || 'all',
    summary: {
      total: goals.length,
      inProgress: goals.filter((entry) => entry.status === 'in_progress').length,
      completed: goals.filter((entry) => entry.status === 'completed').length,
      failed: goals.filter((entry) => entry.status === 'failed').length,
    },
    goals: filteredGoals,
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

function getFilteredTransactions(db, userId, filters = {}) {
  const { type, category, period, startDate, endDate, month } = filters;
  return db.transactions
    .filter((entry) => entry.userId === userId)
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

function buildGoalsSummary(goals) {
  return {
    total: goals.length,
    completed: goals.filter((entry) => entry.status === 'completed').length,
    failed: goals.filter((entry) => entry.status === 'failed').length,
    inProgress: goals.filter((entry) => entry.status === 'in_progress').length,
  };
}

function buildInsights(summary, categoryBreakdown, investmentsSummary, goalsSummary = { total: 0, completed: 0, failed: 0, inProgress: 0 }) {
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

  if (goalsSummary.completed > 0) {
    insights.push(`Voce concluiu ${goalsSummary.completed} meta${goalsSummary.completed > 1 ? 's' : ''} neste periodo.`);
  }

  if (goalsSummary.inProgress > 0) {
    insights.push(`Ha ${goalsSummary.inProgress} meta${goalsSummary.inProgress > 1 ? 's' : ''} em andamento para acompanhar.`);
  }

  if (!insights.length) {
    insights.push('Seu fluxo financeiro está equilibrado no período analisado.');
  }

  return insights.slice(0, 4);
}

function buildReportPayload(db, user, month) {
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  const transactions = getFilteredTransactions(db, user.id, { month: reportMonth });
  const investments = db.investments
    .filter((entry) => entry.userId === user.id && getMonthKey(entry.date) === reportMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const goals = db.goals
    .filter((entry) => entry.userId === user.id && getMonthKey(entry.dueDate) === reportMonth)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const summary = buildTransactionSummary(transactions);
  const categoryBreakdown = buildCategoryBreakdown(transactions);
  const investmentsSummary = buildInvestmentSummary(investments);
  const goalsSummary = buildGoalsSummary(goals);
  const insights = buildInsights(summary, categoryBreakdown, investmentsSummary, goalsSummary);

  return {
    month: reportMonth,
    label: formatMonthLabel(reportMonth),
    summary,
    categoryBreakdown,
    topCategories: categoryBreakdown.slice(0, 3),
    transactionsCount: transactions.length,
    investmentsCount: investments.length,
    investmentsSummary,
    goalsCount: goals.length,
    goalsSummary,
    insights,
    generatedAt: new Date().toISOString(),
  };
}

function ensureStoredReport(db, user, month) {
  const payload = buildReportPayload(db, user, month);
  const existing = db.reports.find((entry) => entry.userId === user.id && entry.month === payload.month);

  if (existing) {
    existing.payload = payload;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const report = {
    id: db.counters.reportId++,
    userId: user.id,
    month: payload.month,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.reports.push(report);
  return report;
}

function refreshAutomaticReports(db, user) {
  const months = new Set();

  db.transactions
    .filter((entry) => entry.userId === user.id)
    .forEach((entry) => months.add(getMonthKey(entry.date)));

  db.investments
    .filter((entry) => entry.userId === user.id)
    .forEach((entry) => months.add(getMonthKey(entry.date)));

  db.goals
    .filter((entry) => entry.userId === user.id)
    .forEach((entry) => months.add(getMonthKey(entry.dueDate)));

  months.add(new Date().toISOString().slice(0, 7));

  Array.from(months).forEach((month) => {
    ensureStoredReport(db, user, month);
  });
}

const REPORT_EXPORT_COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#fb7185', '#a78bfa'];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReportCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function getReportChartEntries(report) {
  const entries = report.payload.categoryBreakdown?.length
    ? report.payload.categoryBreakdown.slice(0, 5)
    : [{ category: 'Sem despesas', total: 0, percentage: 0 }];

  return entries.map((entry, index) => ({
    ...entry,
    color: REPORT_EXPORT_COLORS[index % REPORT_EXPORT_COLORS.length],
  }));
}

function buildReportChartSvg(report) {
  const entries = getReportChartEntries(report);
  const width = 760;
  const rowHeight = 56;
  const height = 72 + entries.length * rowHeight;
  const labelX = 28;
  const barX = 250;
  const barWidth = 430;
  const maxTotal = Math.max(...entries.map((entry) => entry.total), 1);

  const rows = entries
    .map((entry, index) => {
      const y = 22 + index * rowHeight;
      const currentBarWidth = entry.total > 0 ? Math.max((entry.total / maxTotal) * barWidth, 8) : 8;
      return `
        <text x="${labelX}" y="${y + 18}" fill="#dbe7ff" font-size="15" font-family="Arial, sans-serif">${escapeHtml(entry.category)}</text>
        <text x="${labelX}" y="${y + 38}" fill="#8fa6c7" font-size="12" font-family="Arial, sans-serif">${escapeHtml(formatReportCurrency(entry.total))} (${entry.percentage}%)</text>
        <rect x="${barX}" y="${y + 6}" rx="10" ry="10" width="${barWidth}" height="18" fill="rgba(255,255,255,0.08)"></rect>
        <rect x="${barX}" y="${y + 6}" rx="10" ry="10" width="${currentBarWidth}" height="18" fill="${entry.color}"></rect>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Distribuicao por categoria">
      <rect width="${width}" height="${height}" rx="28" fill="#081223"></rect>
      <text x="28" y="38" fill="#f8fbff" font-size="22" font-family="Arial, sans-serif">Distribuicao por categoria</text>
      <text x="28" y="58" fill="#8fa6c7" font-size="13" font-family="Arial, sans-serif">Visual rapido das despesas do periodo selecionado</text>
      ${rows}
    </svg>
  `;
}

function buildReportHtml(user, report) {
  const summary = report.payload.summary;
  const goalsSummary = report.payload.goalsSummary || { total: 0, completed: 0, failed: 0, inProgress: 0 };
  const chartSvg = buildReportChartSvg(report);
  const topCategories = report.payload.topCategories.length
    ? report.payload.topCategories
        .map(
          (entry) =>
            `<li><span>${escapeHtml(entry.category)}</span><strong>${escapeHtml(formatReportCurrency(entry.total))} (${entry.percentage}%)</strong></li>`
        )
        .join('')
    : '<li><span>Sem despesas</span><strong>Sem dados</strong></li>';
  const insights = report.payload.insights.length
    ? report.payload.insights.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')
    : '<li>Nenhum insight disponivel para este periodo.</li>';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Relatorio ${escapeHtml(report.payload.label)}</title>
    <style>
      :root {
        --bg: #eef4fb;
        --sheet: #ffffff;
        --ink: #102035;
        --muted: #62748b;
        --panel: #081223;
        --line: rgba(15, 23, 42, 0.08);
        --accent: #38bdf8;
        --accent-soft: rgba(56, 189, 248, 0.16);
        --success: #34d399;
        --warm: #f59e0b;
        --rose: #fb7185;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        font-family: Arial, sans-serif;
        background: radial-gradient(circle at top, #f8fbff 0%, var(--bg) 52%, #e6edf7 100%);
        color: var(--ink);
      }
      .sheet {
        max-width: 980px;
        margin: 0 auto;
        background: var(--sheet);
        border: 1px solid var(--line);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
      }
      .hero {
        padding: 36px 40px;
        background: linear-gradient(135deg, #081223 0%, #10284c 55%, #13345d 100%);
        color: #f8fbff;
      }
      .eyebrow {
        margin: 0 0 10px;
        color: #8dd7ff;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: 34px;
      }
      .hero p {
        margin: 6px 0;
        color: #d9e8ff;
        font-size: 15px;
      }
      .content {
        padding: 32px 40px 40px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .stat-card {
        padding: 18px;
        border-radius: 20px;
        background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
        border: 1px solid var(--line);
      }
      .stat-card span {
        display: block;
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 8px;
      }
      .stat-card strong {
        display: block;
        font-size: 24px;
        color: var(--ink);
      }
      .section-grid {
        display: grid;
        grid-template-columns: 1.3fr 0.9fr;
        gap: 20px;
        margin-bottom: 22px;
      }
      .panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 22px;
        background: #fff;
      }
      .panel.dark {
        background: transparent;
        border: none;
        padding: 0;
      }
      .panel h2 {
        margin: 0 0 14px;
        font-size: 22px;
      }
      .panel p.subtitle {
        margin: -4px 0 18px;
        color: var(--muted);
      }
      .category-list,
      .insight-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .category-list li,
      .insight-list li {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
      }
      .category-list li:last-child,
      .insight-list li:last-child {
        border-bottom: none;
      }
      .category-list span {
        color: var(--ink);
      }
      .category-list strong,
      .insight-list li {
        color: var(--muted);
      }
      .footer-note {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
      }
      @media print {
        body { padding: 0; background: #fff; }
        .sheet { box-shadow: none; border-radius: 0; border: none; }
      }
      @media (max-width: 880px) {
        body { padding: 16px; }
        .content { padding: 20px; }
        .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .section-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <section class="sheet">
      <header class="hero">
        <p class="eyebrow">GESTAO FINANCEIRA</p>
        <h1>Relatorio mensal</h1>
        <p>Conta: ${escapeHtml(user.email)}</p>
        <p>Periodo analisado: ${escapeHtml(report.payload.label)}</p>
      </header>
      <div class="content">
        <section class="stats">
          <article class="stat-card">
            <span>Entradas</span>
            <strong>${escapeHtml(formatReportCurrency(summary.income))}</strong>
          </article>
          <article class="stat-card">
            <span>Saidas</span>
            <strong>${escapeHtml(formatReportCurrency(summary.expense))}</strong>
          </article>
          <article class="stat-card">
            <span>Saldo final</span>
            <strong>${escapeHtml(formatReportCurrency(summary.balance))}</strong>
          </article>
          <article class="stat-card">
            <span>Movimentacoes</span>
            <strong>${escapeHtml(String(report.payload.transactionsCount))}</strong>
          </article>
          <article class="stat-card">
            <span>Metas do periodo</span>
            <strong>${escapeHtml(String(report.payload.goalsCount || 0))}</strong>
          </article>
          <article class="stat-card">
            <span>Metas concluidas</span>
            <strong>${escapeHtml(String(goalsSummary.completed || 0))}</strong>
          </article>
        </section>

        <section class="section-grid">
          <article class="panel dark">
            ${chartSvg}
          </article>
          <article class="panel">
            <h2>Categorias em destaque</h2>
            <p class="subtitle">As categorias com maior peso nas despesas do periodo.</p>
            <ul class="category-list">${topCategories}</ul>
          </article>
        </section>

        <section class="panel">
          <h2>Leitura automatica</h2>
          <p class="subtitle">Resumo em linguagem simples para ajudar na interpretacao do periodo.</p>
          <ul class="insight-list">${insights}</ul>
          <p class="footer-note">Relatorio gerado em ${escapeHtml(
            new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.payload.generatedAt))
          )}</p>
        </section>
      </div>
    </section>
  </body>
</html>`;
}

function normalizePdfText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatPdfCurrency(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function hexToPdfRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean;
  const red = Number.parseInt(full.slice(0, 2), 16) / 255;
  const green = Number.parseInt(full.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(full.slice(4, 6), 16) / 255;
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function pdfRect(x, y, width, height, color) {
  return `${hexToPdfRgb(color)} rg\n${x} ${y} ${width} ${height} re f`;
}

function pdfText(x, y, text, size = 12, color = '#122033', font = 'F1') {
  return `${hexToPdfRgb(color)} rg\nBT\n/${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(${normalizePdfText(text)}) Tj\nET`;
}

function wrapPdfText(text, maxChars = 70) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const nextLine = `${currentLine} ${words[index]}`;
    if (nextLine.length > maxChars) {
      lines.push(currentLine);
      currentLine = words[index];
    } else {
      currentLine = nextLine;
    }
  }

  lines.push(currentLine);
  return lines;
}

function buildPdfDocument(pageStreams) {
  const objects = [];
  const pageObjectNumbers = [];
  const regularFontObjectNumber = 3 + pageStreams.length * 2;
  const boldFontObjectNumber = regularFontObjectNumber + 1;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  pageStreams.forEach((stream, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontObjectNumber} 0 R /F2 ${boldFontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] =
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`;
  objects[regularFontObjectNumber] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[boldFontObjectNumber] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 1; i < objects.length; i += 1) {
    if (!objects[i]) continue;
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

function buildReportPdf(user, report) {
  const summary = report.payload.summary;
  const goalsSummary = report.payload.goalsSummary || { total: 0, completed: 0, failed: 0, inProgress: 0 };
  const chartEntries = getReportChartEntries(report);
  const generatedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(report.payload.generatedAt)
  );
  const commands = [];

  commands.push(pdfRect(0, 0, 595, 842, '#eef4fb'));
  commands.push(pdfRect(28, 700, 539, 108, '#0b1730'));
  commands.push(pdfText(48, 776, 'RELATORIO MENSAL', 11, '#8dd7ff', 'F2'));
  commands.push(pdfText(48, 742, 'Resumo financeiro do periodo', 24, '#f8fbff', 'F2'));
  commands.push(pdfText(48, 720, `Conta: ${user.email}`, 11, '#dbe7ff'));
  commands.push(pdfText(48, 702, `Periodo: ${report.payload.label}`, 11, '#dbe7ff'));

  const cards = [
    { label: 'Entradas', value: formatPdfCurrency(summary.income) },
    { label: 'Saidas', value: formatPdfCurrency(summary.expense) },
    { label: 'Saldo final', value: formatPdfCurrency(summary.balance) },
    { label: 'Movimentacoes', value: String(report.payload.transactionsCount) },
    { label: 'Metas do periodo', value: String(report.payload.goalsCount || 0) },
    { label: 'Metas concluidas', value: String(goalsSummary.completed || 0) },
  ];

  cards.forEach((card, index) => {
    const x = 28 + (index % 3) * 177;
    const y = index < 3 ? 610 : 526;
    commands.push(pdfRect(x, y, 165, 70, '#ffffff'));
    commands.push(pdfText(x + 14, y + 45, card.label, 10, '#62748b'));
    commands.push(pdfText(x + 14, y + 18, card.value, 17, '#102035', 'F2'));
  });

  commands.push(pdfRect(28, 236, 539, 270, '#ffffff'));
  commands.push(pdfText(46, 565, 'Distribuicao por categoria', 18, '#102035', 'F2'));
  commands.push(pdfText(46, 547, 'Grafico resumido das despesas do periodo', 10, '#62748b'));

  const maxTotal = Math.max(...chartEntries.map((entry) => entry.total), 1);
  chartEntries.forEach((entry, index) => {
    const rowY = 421 - index * 46;
    const barWidth = entry.total > 0 ? Math.max((entry.total / maxTotal) * 245, 10) : 10;
    commands.push(pdfText(46, rowY + 12, entry.category, 10, '#102035', 'F2'));
    commands.push(pdfText(46, rowY - 4, `${formatPdfCurrency(entry.total)} (${entry.percentage}%)`, 9, '#62748b'));
    commands.push(pdfRect(262, rowY + 2, 250, 14, '#dbe7ff'));
    commands.push(pdfRect(262, rowY + 2, barWidth, 14, entry.color));
  });

  commands.push(pdfRect(28, 24, 539, 188, '#ffffff'));
  commands.push(pdfText(46, 187, 'Leitura automatica', 18, '#102035', 'F2'));
  commands.push(pdfText(46, 169, 'Mensagens simples para ajudar na interpretacao', 10, '#62748b'));

  let currentY = 140;
  const insightItems = report.payload.insights.length ? report.payload.insights : ['Nenhum insight disponivel para este periodo.'];

  insightItems.slice(0, 4).forEach((entry) => {
    const wrappedLines = wrapPdfText(`- ${entry}`, 78);
    wrappedLines.forEach((line) => {
      commands.push(pdfText(46, currentY, line, 11, '#334155'));
      currentY -= 16;
    });
    currentY -= 10;
  });

  commands.push(pdfText(46, 44, `Relatorio gerado em ${generatedAt}`, 9, '#62748b'));

  return buildPdfDocument([commands.join('\n')]);
}

function getDashboardPayload(db, userId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const allTransactions = getFilteredTransactions(db, userId, {});
  const monthTransactions = getFilteredTransactions(db, userId, { month: currentMonth });
  const latestTransactions = allTransactions.slice(0, 5);

  return {
    summary: buildTransactionSummary(monthTransactions),
    latestTransactions,
    categoryBreakdown: buildCategoryBreakdown(monthTransactions),
    monthlySeries: buildMonthlySeries(allTransactions).slice(-6),
  };
}

async function handleApi(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = parsedUrl.pathname;
  const transactionMatch = route.match(/^\/api\/transactions\/(\d+)$/);
  const investmentMatch = route.match(/^\/api\/investments\/(\d+)$/);
  const goalMatch = route.match(/^\/api\/goals\/(\d+)$/);
  const db = readDatabase();
  hydrateDatabase(db);

  if (req.method === 'POST' && route === '/api/register') {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha são obrigatórios.' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const exists = getUserByEmail(db, normalizedEmail);
    if (exists) {
      if (isUserVerified(exists)) {
        sendJson(res, 409, { message: 'Email já cadastrado.' });
        return;
      }

      const payload = await issueRegistrationOtp(db, exists);
      writeDatabase(db);
      sendJson(res, 200, payload);
      return;
    }

    const user = {
      id: db.counters.userId++,
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    const payload = await issueRegistrationOtp(db, user);
    writeDatabase(db);
    sendJson(res, 201, payload);
    return;
  }

  if (req.method === 'POST' && route === '/api/login') {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha são obrigatórios.' });
      return;
    }

    const user = getUserByEmail(db, email);
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      sendJson(res, 401, { message: 'Credenciais inválidas.' });
      return;
    }

    if (!isUserVerified(user)) {
      sendJson(res, 403, { message: 'Você precisa confirmar o cadastro com o OTP enviado por email antes de fazer login.' });
      return;
    }

    sendJson(res, 200, {
      message: 'Login realizado com sucesso.',
      token: `demo-token-${user.id}-${Date.now()}`,
    });
    return;
  }

  if (
    req.method === 'POST' &&
    (route === '/api/verify-otp' || route === '/api/verify-email')
  ) {
    const { email, otp } = await parseBody(req);
    if (!email || !otp) {
      sendJson(res, 400, { message: 'Email e OTP são obrigatórios.' });
      return;
    }

    const user = getUserByEmail(db, email);
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const userOtps = db.otps
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const currentOtp = userOtps[0];
    if (!currentOtp || currentOtp.used) {
      sendJson(res, 401, { message: 'OTP inválido ou já utilizado.' });
      return;
    }

    if (new Date(currentOtp.expiresAt).getTime() < Date.now()) {
      sendJson(res, 401, { message: 'OTP expirado.' });
      return;
    }

    if (String(otp).trim() !== currentOtp.code) {
      sendJson(res, 401, { message: 'OTP incorreto.' });
      return;
    }

    currentOtp.used = true;
    user.isVerified = true;
    writeDatabase(db);
    sendJson(res, 200, {
      message: 'Cadastro confirmado com sucesso. Agora você pode fazer login.',
    });
    return;
  }

  if (req.method === 'GET' && route === '/api/categories') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    writeDatabase(db);
    sendJson(res, 200, { categories: getUserCategories(db, user.id) });
    return;
  }

  if (req.method === 'POST' && route === '/api/categories') {
    const { email, name } = await parseBody(req);
    const user = getUserByEmail(db, email);
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const category = ensureCategory(db, user.id, name);
    if (!category) {
      sendJson(res, 400, { message: 'Informe uma categoria válida.' });
      return;
    }

    writeDatabase(db);
    sendJson(res, 201, {
      message: 'Categoria cadastrada com sucesso.',
      categories: getUserCategories(db, user.id),
    });
    return;
  }

  if (req.method === 'POST' && route === '/api/transactions') {
    const { email, type, amount, category, date, notes } = await parseBody(req);
    const user = getUserByEmail(db, email);
    const normalizedType = normalizeText(type).toLowerCase();
    const numericAmount = Number(amount);

    if (!user || !['income', 'expense'].includes(normalizedType)) {
      sendJson(res, 400, { message: 'Email e tipo são obrigatórios.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      sendJson(res, 400, { message: 'Valor inválido.' });
      return;
    }

    const normalizedCategory = ensureCategory(db, user.id, category || 'Outros');

    db.transactions.push({
      id: db.counters.transactionId++,
      userId: user.id,
      type: normalizedType,
      amount: Number(numericAmount.toFixed(2)),
      category: normalizedCategory,
      notes: normalizeText(notes).slice(0, 160),
      date: normalizeDate(date),
      createdAt: new Date().toISOString(),
    });

    refreshAutomaticReports(db, user);
    writeDatabase(db);
    sendJson(res, 201, { message: 'Movimentação adicionada com sucesso.' });
    return;
  }

  if (req.method === 'GET' && route === '/api/transactions') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const filters = {
      type: parsedUrl.searchParams.get('type'),
      category: parsedUrl.searchParams.get('category'),
      period: parsedUrl.searchParams.get('period'),
      startDate: parsedUrl.searchParams.get('startDate'),
      endDate: parsedUrl.searchParams.get('endDate'),
      month: parsedUrl.searchParams.get('month'),
    };

    const filteredTransactions = getFilteredTransactions(db, user.id, filters);
    const allTransactions = getFilteredTransactions(db, user.id, {});

    writeDatabase(db);
    sendJson(res, 200, {
      summary: buildTransactionSummary(filteredTransactions),
      totalCount: filteredTransactions.length,
      transactions: filteredTransactions.slice(0, 100),
      categoryBreakdown: buildCategoryBreakdown(filteredTransactions),
      monthlySeries: buildMonthlySeries(allTransactions).slice(-6),
    });
    return;
  }

  if ((req.method === 'PUT' || req.method === 'DELETE') && transactionMatch) {
    const transactionId = Number(transactionMatch[1]);
    const data = req.method === 'DELETE' ? { email: parsedUrl.searchParams.get('email') } : await parseBody(req);
    const user = getUserByEmail(db, data.email);

    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const index = db.transactions.findIndex((entry) => entry.id === transactionId && entry.userId === user.id);
    if (index === -1) {
      sendJson(res, 404, { message: 'Movimentação não encontrada.' });
      return;
    }

    if (req.method === 'DELETE') {
      db.transactions.splice(index, 1);
      refreshAutomaticReports(db, user);
      writeDatabase(db);
      sendJson(res, 200, { message: 'Movimentação excluída com sucesso.' });
      return;
    }

    const { type, amount, category, date, notes } = data;
    const normalizedType = normalizeText(type).toLowerCase();
    const numericAmount = Number(amount);

    if (!['income', 'expense'].includes(normalizedType)) {
      sendJson(res, 400, { message: 'Tipo inválido.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      sendJson(res, 400, { message: 'Valor inválido.' });
      return;
    }

    const normalizedCategory = ensureCategory(db, user.id, category || 'Outros');
    db.transactions[index] = {
      ...db.transactions[index],
      type: normalizedType,
      amount: Number(numericAmount.toFixed(2)),
      category: normalizedCategory,
      notes: normalizeText(notes).slice(0, 160),
      date: normalizeDate(date),
    };

    refreshAutomaticReports(db, user);
    writeDatabase(db);
    sendJson(res, 200, { message: 'Movimentação atualizada com sucesso.' });
    return;
  }

  if (req.method === 'GET' && route === '/api/dashboard') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    refreshAutomaticReports(db, user);
    writeDatabase(db);
    sendJson(res, 200, getDashboardPayload(db, user.id));
    return;
  }

  if (req.method === 'POST' && route === '/api/investments') {
    const { email, monthlyAmount, riskProfile, years } = await parseBody(req);
    const user = getUserByEmail(db, email);
    const numericAmount = Number(monthlyAmount);
    const numericYears = Number.parseInt(years, 10);
    const normalizedRiskProfile = normalizeRiskProfile(riskProfile);

    if (!user) {
      sendJson(res, 400, { message: 'Email é obrigatório.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      sendJson(res, 400, { message: 'Informe um valor mensal válido.' });
      return;
    }

    if (!Number.isFinite(numericYears) || numericYears <= 0) {
      sendJson(res, 400, { message: 'Escolha um tempo de investimento válido.' });
      return;
    }

    db.investments.push({
      id: db.counters.investmentId++,
      userId: user.id,
      monthlyAmount: Number(numericAmount.toFixed(2)),
      riskProfile: normalizedRiskProfile,
      years: numericYears,
      date: normalizeDate(new Date().toISOString()),
      createdAt: new Date().toISOString(),
    });

    refreshAutomaticReports(db, user);
    writeDatabase(db);
    const profile = getRiskProfileConfig(normalizedRiskProfile);
    sendJson(res, 201, {
      message: `Simulação salva com sucesso. Perfil ${profile.label.toLowerCase()} com ${profile.annualRate}% ao ano.`,
    });
    return;
  }

  if (req.method === 'GET' && route === '/api/investments') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const investments = db.investments
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    refreshAutomaticReports(db, user);
    writeDatabase(db);
    sendJson(res, 200, {
      summary: buildInvestmentSummary(investments),
      evolution: buildInvestmentEvolution(investments),
      investments,
    });
    return;
  }

  if ((req.method === 'PUT' || req.method === 'DELETE') && investmentMatch) {
    const investmentId = Number(investmentMatch[1]);
    const data = req.method === 'DELETE' ? { email: parsedUrl.searchParams.get('email') } : await parseBody(req);
    const user = getUserByEmail(db, data.email);

    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const index = db.investments.findIndex((entry) => entry.id === investmentId && entry.userId === user.id);
    if (index === -1) {
      sendJson(res, 404, { message: 'Investimento não encontrado.' });
      return;
    }

    if (req.method === 'DELETE') {
      db.investments.splice(index, 1);
      refreshAutomaticReports(db, user);
      writeDatabase(db);
      sendJson(res, 200, { message: 'Investimento excluído com sucesso.' });
      return;
    }

    const numericAmount = Number(data.monthlyAmount);
    const numericYears = Number.parseInt(data.years, 10);
    const normalizedRiskProfile = normalizeRiskProfile(data.riskProfile);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      sendJson(res, 400, { message: 'Informe um valor mensal válido.' });
      return;
    }

    if (!Number.isFinite(numericYears) || numericYears <= 0) {
      sendJson(res, 400, { message: 'Escolha um tempo de investimento válido.' });
      return;
    }

    db.investments[index] = {
      ...db.investments[index],
      monthlyAmount: Number(numericAmount.toFixed(2)),
      riskProfile: normalizedRiskProfile,
      years: numericYears,
    };

    refreshAutomaticReports(db, user);
    writeDatabase(db);
    sendJson(res, 200, { message: 'Simulação atualizada com sucesso.' });
    return;
  }

  if (req.method === 'POST' && route === '/api/goals') {
    const { email, name, targetAmount, currentAmount, dueDate, category } = await parseBody(req);
    const user = getUserByEmail(db, email);
    const numericTargetAmount = Number(targetAmount);
    const numericCurrentAmount = Number(currentAmount || 0);

    if (!user) {
      sendJson(res, 404, { message: 'UsuÃ¡rio nÃ£o encontrado.' });
      return;
    }

    if (!normalizeText(name)) {
      sendJson(res, 400, { message: 'Informe o nome da meta.' });
      return;
    }

    if (!Number.isFinite(numericTargetAmount) || numericTargetAmount <= 0) {
      sendJson(res, 400, { message: 'Informe um valor alvo vÃ¡lido.' });
      return;
    }

    if (!Number.isFinite(numericCurrentAmount) || numericCurrentAmount < 0) {
      sendJson(res, 400, { message: 'Informe um valor atual vÃ¡lido.' });
      return;
    }

    db.goals.push({
      id: db.counters.goalId++,
      userId: user.id,
      name: normalizeText(name).slice(0, 80),
      targetAmount: Number(numericTargetAmount.toFixed(2)),
      currentAmount: Number(numericCurrentAmount.toFixed(2)),
      dueDate: normalizeDate(dueDate),
      category: normalizeText(category).slice(0, 40),
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    hydrateDatabase(db);
    writeDatabase(db);
    sendJson(res, 201, { message: 'Meta criada com sucesso.' });
    return;
  }

  if (req.method === 'GET' && route === '/api/goals') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'UsuÃ¡rio nÃ£o encontrado.' });
      return;
    }

    const filter = normalizeText(parsedUrl.searchParams.get('status'), 'all');
    const goals = db.goals.filter((entry) => entry.userId === user.id);
    writeDatabase(db);
    sendJson(res, 200, buildGoalsPayload(goals, filter));
    return;
  }

  if ((req.method === 'PUT' || req.method === 'DELETE') && goalMatch) {
    const goalId = Number(goalMatch[1]);
    const data = req.method === 'DELETE' ? { email: parsedUrl.searchParams.get('email') } : await parseBody(req);
    const user = getUserByEmail(db, data.email);

    if (!user) {
      sendJson(res, 404, { message: 'UsuÃ¡rio nÃ£o encontrado.' });
      return;
    }

    const index = db.goals.findIndex((entry) => entry.id === goalId && entry.userId === user.id);
    if (index === -1) {
      sendJson(res, 404, { message: 'Meta nÃ£o encontrada.' });
      return;
    }

    if (req.method === 'DELETE') {
      db.goals.splice(index, 1);
      writeDatabase(db);
      sendJson(res, 200, { message: 'Meta excluÃ­da com sucesso.' });
      return;
    }

    const existing = db.goals[index];
    const hasAddAmount = data.addAmount !== undefined && data.addAmount !== null && data.addAmount !== '';
    const addAmount = Number(data.addAmount || 0);
    const hasCurrentAmount = data.currentAmount !== undefined && data.currentAmount !== null && data.currentAmount !== '';
    const nextCurrentAmount = hasCurrentAmount
      ? Number(data.currentAmount)
      : hasAddAmount
        ? Number(existing.currentAmount) + addAmount
        : Number(existing.currentAmount);
    const nextTargetAmount = data.targetAmount !== undefined ? Number(data.targetAmount) : Number(existing.targetAmount);

    if (!Number.isFinite(nextTargetAmount) || nextTargetAmount <= 0) {
      sendJson(res, 400, { message: 'Informe um valor alvo vÃ¡lido.' });
      return;
    }

    if (!Number.isFinite(nextCurrentAmount) || nextCurrentAmount < 0) {
      sendJson(res, 400, { message: 'Informe um valor atual vÃ¡lido.' });
      return;
    }

    if (hasAddAmount && (!Number.isFinite(addAmount) || addAmount <= 0)) {
      sendJson(res, 400, { message: 'Informe um valor para adicionar que seja vÃ¡lido.' });
      return;
    }

    db.goals[index] = normalizeGoal(user.id, {
      ...existing,
      name: data.name !== undefined ? normalizeText(data.name, existing.name).slice(0, 80) : existing.name,
      targetAmount: Number(nextTargetAmount.toFixed(2)),
      currentAmount: Number(nextCurrentAmount.toFixed(2)),
      dueDate: data.dueDate !== undefined ? normalizeDate(data.dueDate) : existing.dueDate,
      category: data.category !== undefined ? normalizeText(data.category).slice(0, 40) : existing.category,
      status: data.status !== undefined ? normalizeGoalStatus(data.status) : existing.status,
      updatedAt: new Date().toISOString(),
    });

    writeDatabase(db);
    sendJson(res, 200, {
      message: hasAddAmount ? 'Progresso da meta atualizado com sucesso.' : 'Meta atualizada com sucesso.',
      goal: db.goals[index],
    });
    return;
  }

  if (req.method === 'POST' && route === '/api/reports/generate') {
    const { email, month } = await parseBody(req);
    const user = getUserByEmail(db, email);
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const report = ensureStoredReport(db, user, month);
    writeDatabase(db);
    sendJson(res, 201, {
      message: 'Relatório gerado com sucesso.',
      report: report.payload,
    });
    return;
  }

  if (req.method === 'GET' && route === '/api/reports') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    refreshAutomaticReports(db, user);
    const selectedMonth = parsedUrl.searchParams.get('month');
    const selectedReport = selectedMonth
      ? ensureStoredReport(db, user, selectedMonth)
      : ensureStoredReport(db, user, new Date().toISOString().slice(0, 7));

    const reports = db.reports
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => b.month.localeCompare(a.month));

    writeDatabase(db);
    sendJson(res, 200, {
      reports: reports.map((entry) => entry.payload),
      selectedReport: selectedReport.payload,
    });
    return;
  }

  if (req.method === 'GET' && route === '/api/reports/export') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const month = parsedUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const report = ensureStoredReport(db, user, month);
    writeDatabase(db);
    sendHtml(res, 200, buildReportHtml(user, report));
    return;
  }

  if (req.method === 'GET' && route === '/api/reports/export.pdf') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const month = parsedUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const report = ensureStoredReport(db, user, month);
    writeDatabase(db);
    sendPdf(res, 200, buildReportPdf(user, report), `relatorio-${month}.pdf`);
    return;
  }

  sendJson(res, 404, { message: 'Endpoint não encontrado.' });
}

ensureDatabase();

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    console.error('Erro interno:', error);
    sendJson(res, 500, { message: 'Erro interno no servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor executando em http://localhost:${PORT}`);
});
