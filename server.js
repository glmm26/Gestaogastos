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

function hydrateDatabase(db) {
  db.transactions = db.transactions.map((entry) => normalizeTransaction(entry.userId, entry));
  db.investments = db.investments.map((entry) => normalizeInvestment(entry.userId, entry));

  db.transactions.forEach((entry) => {
    ensureCategory(db, entry.userId, entry.category);
  });
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

function buildReportPayload(db, user, month) {
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  const transactions = getFilteredTransactions(db, user.id, { month: reportMonth });
  const investments = db.investments
    .filter((entry) => entry.userId === user.id && getMonthKey(entry.date) === reportMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const summary = buildTransactionSummary(transactions);
  const categoryBreakdown = buildCategoryBreakdown(transactions);
  const investmentsSummary = buildInvestmentSummary(investments);
  const insights = buildInsights(summary, categoryBreakdown, investmentsSummary);

  return {
    month: reportMonth,
    label: formatMonthLabel(reportMonth),
    summary,
    categoryBreakdown,
    topCategories: categoryBreakdown.slice(0, 3),
    transactionsCount: transactions.length,
    investmentsCount: investments.length,
    investmentsSummary,
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

  months.add(new Date().toISOString().slice(0, 7));

  Array.from(months).forEach((month) => {
    ensureStoredReport(db, user, month);
  });
}

function buildReportHtml(user, report) {
  const summary = report.payload.summary;
  const topCategories = report.payload.topCategories
    .map((entry) => `<li>${entry.category}: R$ ${entry.total.toFixed(2).replace('.', ',')} (${entry.percentage}%)</li>`)
    .join('');
  const insights = report.payload.insights.map((entry) => `<li>${entry}</li>`).join('');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Relatorio ${report.payload.label}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f7fb; color: #122033; margin: 0; padding: 32px; }
      .sheet { max-width: 900px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
      h1, h2 { margin: 0 0 12px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
      .card { padding: 16px; border-radius: 12px; background: #eff5ff; }
      ul { padding-left: 18px; }
    </style>
  </head>
  <body>
    <section class="sheet">
      <h1>Relatorio mensal</h1>
      <p><strong>Conta:</strong> ${user.email}</p>
      <p><strong>Periodo:</strong> ${report.payload.label}</p>
      <div class="grid">
        <div class="card"><strong>Entradas</strong><br />R$ ${summary.income.toFixed(2).replace('.', ',')}</div>
        <div class="card"><strong>Saidas</strong><br />R$ ${summary.expense.toFixed(2).replace('.', ',')}</div>
        <div class="card"><strong>Saldo final</strong><br />R$ ${summary.balance.toFixed(2).replace('.', ',')}</div>
      </div>
      <h2>Categorias principais</h2>
      <ul>${topCategories || '<li>Nenhuma despesa registrada no período.</li>'}</ul>
      <h2>Insights automáticos</h2>
      <ul>${insights}</ul>
      <p><small>Relatorio gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.payload.generatedAt))}</small></p>
    </section>
  </body>
</html>`;
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
