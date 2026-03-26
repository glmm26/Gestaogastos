const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const { garantirBancoDados, lerBancoDados, escreverBancoDados } = require('./db');

loadDotenv(path.join(__dirname, '.env'));

const PORTA = process.env.PORT || 3000;
const MINUTOS_EXPIRACAO_OTP = 5;
const DIRETORIO_PUBLICO = path.join(__dirname, 'public');
const DIRETORIO_UPLOADS = path.join(__dirname, 'uploads');
const DIRETORIO_TEMPLATES = path.join(__dirname, 'templates');
const CAMINHO_TEMPLATE_RELATORIO_PDF = path.join(DIRETORIO_TEMPLATES, 'relatorio-pdf.html');
const CATEGORIAS_PADRAO = ['Salario', 'Alimentacao', 'Transporte', 'Lazer', 'Moradia', 'Outros'];
const TAMANHO_MAXIMO_FOTO_PERFIL = 2 * 1024 * 1024;
const TIPOS_PERMITIDOS_FOTO_PERFIL = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
};
const PERFIS_RISCO_INVESTIMENTO = {
  low: { label: 'Baixo risco', annualRate: 8 },
  medium: { label: 'Medio risco', annualRate: 12 },
  high: { label: 'Alto risco', annualRate: 18 },
};
const PROVEDOR_EMAIL = String(process.env.EMAIL_PROVIDER || 'api').trim().toLowerCase();
const URL_API_EMAIL = String(process.env.EMAIL_API_URL || 'https://api.brevo.com/v3/smtp/email').trim();
const CHAVE_API_EMAIL = String(process.env.EMAIL_API_KEY || '').trim();
const EMAIL_REMETENTE_API = String(process.env.EMAIL_API_SENDER_EMAIL || '').trim();
const NOME_REMETENTE_API = String(process.env.EMAIL_API_SENDER_NAME || 'Gestão de Gastos').trim();

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

function sendPdf(res, pdfBuffer, fileName) {
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': pdfBuffer.length,
    'Cache-Control': 'no-store',
  });
  res.end(pdfBuffer);
}

function ensureUploadsDir() {
  if (!fs.existsSync(DIRETORIO_UPLOADS)) {
    fs.mkdirSync(DIRETORIO_UPLOADS, { recursive: true });
  }
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

function parseMultipartFormData(req, maxSize = TAMANHO_MAXIMO_FOTO_PERFIL + 1024 * 200) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      reject(new Error('Envio de arquivo inválido.'));
      return;
    }

    const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
    const chunks = [];
    let totalSize = 0;

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        const error = new Error('A imagem deve ter no máximo 2MB.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks);
      const raw = bodyBuffer.toString('latin1');
      const parts = raw.split(boundary).slice(1, -1);
      const fields = {};
      const files = [];

      parts.forEach((part) => {
        const normalizedPart = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
        if (!normalizedPart.trim()) return;

        const headerEndIndex = normalizedPart.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) return;

        const headersText = normalizedPart.slice(0, headerEndIndex);
        const contentText = normalizedPart.slice(headerEndIndex + 4);
        const disposition = headersText.match(/name="([^"]+)"/i);
        if (!disposition) return;

        const fieldName = disposition[1];
        const fileNameMatch = headersText.match(/filename="([^"]*)"/i);
        const contentTypeMatch = headersText.match(/Content-Type:\s*([^\r\n]+)/i);
        const cleanContentText = contentText.replace(/\r\n$/, '');

        if (fileNameMatch && fileNameMatch[1]) {
          files.push({
            fieldName,
            originalName: path.basename(fileNameMatch[1]),
            mimeType: (contentTypeMatch?.[1] || '').trim().toLowerCase(),
            buffer: Buffer.from(cleanContentText, 'latin1'),
          });
          return;
        }

        fields[fieldName] = Buffer.from(cleanContentText, 'latin1').toString('utf-8').trim();
      });

      resolve({ fields, files });
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
    PROVEDOR_EMAIL === 'api' &&
    URL_API_EMAIL &&
    CHAVE_API_EMAIL &&
    EMAIL_REMETENTE_API &&
    !CHAVE_API_EMAIL.includes('COLOQUE_SUA_CHAVE_BREVO_AQUI')
  );
}

async function sendOtpEmail(targetEmail, otp) {
  if (!isEmailApiConfigured()) {
    throw new Error('Serviço de email não configurado.');
  }

  const payload = {
    sender: {
      name: NOME_REMETENTE_API,
      email: EMAIL_REMETENTE_API,
    },
    to: [{ email: targetEmail }],
    subject: 'Código de confirmação de cadastro - Gestão de Gastos',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Código de confirmação</h2>
          <p>Use o código abaixo para concluir seu cadastro:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>Esse código expira em ${MINUTOS_EXPIRACAO_OTP} minutos.</p>
        </body>
      </html>
    `,
  };

  const response = await fetch(URL_API_EMAIL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': CHAVE_API_EMAIL,
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

function normalizeUserName(value, fallback = 'Usuario') {
  return normalizeText(value, fallback)
    .replace(/\s+/g, ' ')
    .slice(0, 80);
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

function getPendingUserByEmail(db, email) {
  const normalizedEmail = normalizeEmail(email);
  return db.pendingUsers.find((entry) => entry.email === normalizedEmail);
}

function getLatestOtpForEmail(db, email) {
  const normalizedEmail = normalizeEmail(email);
  return db.otps
    .filter((entry) => normalizeEmail(entry.email) === normalizedEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function buildSessionToken(user) {
  return `demo-token-${user.id}-${Date.now()}`;
}

function buildPhotoUrl(photoPath, updatedAt) {
  if (!photoPath) return '/avatar-default.svg';
  const version = encodeURIComponent(updatedAt || Date.now());
  return `${photoPath}?v=${version}`;
}

function removeStoredPhoto(photoPath) {
  if (!photoPath || !photoPath.startsWith('/uploads/')) return;
  const targetPath = path.join(DIRETORIO_UPLOADS, path.basename(photoPath));
  if (targetPath.startsWith(DIRETORIO_UPLOADS) && fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}

async function issueRegistrationOtp(db, user) {
  db.otps = db.otps.map((entry) =>
    normalizeEmail(entry.email) === normalizeEmail(user.email) && entry.used === false ? { ...entry, used: true } : entry
  );

  const otp = generateOtp();
  db.otps.push({
    id: db.counters.otpId++,
    userId: user.userId || user.id || null,
    pendingUserId: user.pendingUserId || null,
    email: normalizeEmail(user.email),
    code: otp,
    expiresAt: new Date(Date.now() + MINUTOS_EXPIRACAO_OTP * 60 * 1000).toISOString(),
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
      ? `Código de cadastro enviado para ${user.email}. Validade de ${MINUTOS_EXPIRACAO_OTP} minutos.`
      : 'Código de cadastro gerado. Como o envio por email não está disponível, use o código de desenvolvimento.',
    devOtp: emailSent ? undefined : otp,
    deliveryWarning: emailSent ? undefined : deliveryWarning,
  };
}

function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url;
  const pathname = new URL(requestedPath, 'http://localhost').pathname;
  const safePath = path.normalize(pathname).replace(/\\/g, '/').replace(/^\.\.(\/|\\|$)/, '');
  const baseDir = safePath.startsWith('/uploads/') ? DIRETORIO_UPLOADS : DIRETORIO_PUBLICO;
  const relativePath = safePath.startsWith('/uploads/') ? safePath.replace(/^\/uploads/, '') : safePath;
  const filePath = path.join(baseDir, relativePath);

  if (!filePath.startsWith(baseDir)) {
    sendJson(res, 403, { message: 'Acesso negado.' });
    return;
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (baseDir === DIRETORIO_UPLOADS) {
      sendJson(res, 404, { message: 'Arquivo não encontrado.' });
      return;
    }
    const fallback = path.join(DIRETORIO_PUBLICO, 'index.html');
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
  return PERFIS_RISCO_INVESTIMENTO[normalizeRiskProfile(profile)] || PERFIS_RISCO_INVESTIMENTO.medium;
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

function normalizeMonthKey(value) {
  const monthKey = normalizeText(value);
  return /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : new Date().toISOString().slice(0, 7);
}

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

function getUserByEmail(db, email) {
  const normalizedEmail = normalizeEmail(email);
  return db.users.find((entry) => entry.email === normalizedEmail);
}

function normalizeUser(user) {
  const createdAt = user.createdAt || new Date().toISOString();
  return {
    id: user.id,
    email: normalizeEmail(user.email),
    name: normalizeUserName(user.name || user.fullName || user.email?.split('@')[0] || 'Usuario'),
    passwordHash: normalizeText(user.passwordHash),
    photo: normalizePhotoPath(user.photo || user.foto),
    photoUpdatedAt: user.photoUpdatedAt || user.updatedAt || createdAt,
    isVerified: user.isVerified !== false,
    createdAt,
  };
}

function normalizePendingUser(pendingUser) {
  const createdAt = pendingUser.createdAt || new Date().toISOString();
  return {
    id: pendingUser.id,
    email: normalizeEmail(pendingUser.email),
    name: normalizeUserName(pendingUser.name || pendingUser.fullName || pendingUser.email?.split('@')[0] || 'Usuario'),
    passwordHash: normalizeText(pendingUser.passwordHash),
    createdAt,
    updatedAt: pendingUser.updatedAt || createdAt,
  };
}

function getUserCategories(db, userId) {
  const custom = db.customCategories
    .filter((entry) => entry.userId === userId)
    .map((entry) => entry.name)
    .filter(Boolean);

  return Array.from(new Set([...CATEGORIAS_PADRAO, ...custom]));
}

function ensureCategory(db, userId, category) {
  const normalized = normalizeCategoryName(category);
  if (!normalized || CATEGORIAS_PADRAO.includes(normalized)) {
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

  const match = CATEGORIAS_PADRAO.find((category) => category.toLowerCase() === description.toLowerCase());
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
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'completed' || normalized === 'failed' || normalized === 'active') {
    return normalized;
  }
  return 'active';
}

function normalizeGoal(userId, goal) {
  const createdAt = goal.createdAt || new Date().toISOString();
  const targetAmount = Math.max(1, Number(goal.targetAmount || goal.targetValue || 0));
  const currentAmount = Math.max(0, Number(goal.currentAmount || goal.currentValue || 0));
  const progress = Math.min(100, Number(((currentAmount / targetAmount) * 100).toFixed(1)));
  const status = normalizeGoalStatus(goal.status);
  return {
    id: goal.id,
    userId,
    name: normalizeText(goal.name || 'Meta'),
    targetAmount: Number(targetAmount.toFixed(2)),
    currentAmount: Number(currentAmount.toFixed(2)),
    deadline: normalizeDate(goal.deadline || goal.targetDate || createdAt),
    category: normalizeCategoryName(goal.category || ''),
    status,
    progress,
    createdAt,
    updatedAt: goal.updatedAt || createdAt,
  };
}

function buildGoalsSummary(goals) {
  return {
    total: goals.length,
    active: goals.filter((goal) => goal.status === 'active').length,
    completed: goals.filter((goal) => goal.status === 'completed').length,
    failed: goals.filter((goal) => goal.status === 'failed').length,
  };
}

function getFilteredGoals(db, userId, status = 'all') {
  return db.goals
    .filter((goal) => goal.userId === userId)
    .filter((goal) => status === 'all' || !status ? true : goal.status === status)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

function hydrateDatabase(db) {
  db.users = db.users.map((entry) => normalizeUser(entry));
  db.pendingUsers = db.pendingUsers.map((entry) => normalizePendingUser(entry));
  db.transactions = db.transactions.map((entry) => normalizeTransaction(entry.userId, entry));
  db.investments = db.investments.map((entry) => normalizeInvestment(entry.userId, entry));
  db.goals = db.goals.map((entry) => normalizeGoal(entry.userId, entry));
  db.otps = db.otps.map((entry) => ({
    ...entry,
    email: normalizeEmail(
      entry.email ||
        db.users.find((user) => user.id === entry.userId)?.email ||
        db.pendingUsers.find((pendingUser) => pendingUser.id === entry.pendingUserId)?.email ||
        ''
    ),
  }));

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

function buildReportHtml(user, report, transactions = []) {
  return buildPdfHtml(user, report, transactions, {});
}

function buildReportRowsMarkup(transactions) {
  if (!transactions.length) {
    return '<tr><td colspan="4">Nenhuma movimentacao registrada no periodo selecionado.</td></tr>';
  }

  return transactions
    .map((entry) => {
      const typeLabel = entry.type === 'income' ? 'Entrada' : 'Saida';
      const notes = entry.notes ? `<span class="table-notes">${escapeHtml(entry.notes)}</span>` : '';
      return `<tr>
        <td>${escapeHtml(formatDateBR(entry.date))}</td>
        <td><span class="type-pill ${entry.type === 'income' ? 'income' : 'expense'}">${typeLabel}</span></td>
        <td>${escapeHtml(formatCurrencyBRL(entry.amount))}</td>
        <td>${escapeHtml(entry.category)}${notes}</td>
      </tr>`;
    })
    .join('');
}

function buildChartSectionMarkup(title, image, emptyMessage) {
  if (!image) {
    return `<section class="chart-card empty">
      <div class="section-heading">
        <p class="eyebrow">Grafico</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="empty-chart">${escapeHtml(emptyMessage)}</div>
    </section>`;
  }

  return `<section class="chart-card">
    <div class="section-heading">
      <p class="eyebrow">Grafico</p>
      <h3>${escapeHtml(title)}</h3>
    </div>
    <img src="${image}" alt="${escapeHtml(title)}" />
  </section>`;
}

function renderTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (html, [key, value]) => html.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    template
  );
}

function buildPdfHtml(user, report, transactions, charts = {}) {
  const template = fs.readFileSync(CAMINHO_TEMPLATE_RELATORIO_PDF, 'utf-8');
  const summary = report.payload.summary;
  const categoryChart = sanitizeBase64Image(charts.category);
  const cashFlowChart = sanitizeBase64Image(charts.cashFlow);
  const userName = user.name || user.email || 'Usuario';
  const generatedAt = formatDateTimeBR(report.payload.generatedAt);
  const topCategories = report.payload.topCategories.length
    ? report.payload.topCategories
        .map(
          (entry) =>
            `<li><span>${escapeHtml(entry.category)}</span><strong>${escapeHtml(
              `${formatCurrencyBRL(entry.total)} • ${entry.percentage}%`
            )}</strong></li>`
        )
        .join('')
    : '<li><span>Sem despesas relevantes no periodo.</span><strong>--</strong></li>';
  const insights = report.payload.insights.length
    ? report.payload.insights.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')
    : '<li>Nenhum insight disponivel.</li>';

  return renderTemplate(template, {
    REPORT_TITLE: 'Relatorio Financeiro',
    REPORT_MONTH: escapeHtml(report.payload.label),
    USER_NAME: escapeHtml(userName),
    USER_EMAIL: escapeHtml(user.email || ''),
    GENERATED_AT: escapeHtml(generatedAt),
    PERIOD_LABEL: escapeHtml(report.payload.label),
    SUMMARY_INCOME: escapeHtml(formatCurrencyBRL(summary.income)),
    SUMMARY_EXPENSE: escapeHtml(formatCurrencyBRL(summary.expense)),
    SUMMARY_BALANCE: escapeHtml(formatCurrencyBRL(summary.balance)),
    SUMMARY_COUNT: escapeHtml(String(report.payload.transactionsCount)),
    TOP_CATEGORIES: topCategories,
    INSIGHTS: insights,
    CATEGORY_CHART_SECTION: buildChartSectionMarkup(
      'Gastos por categoria',
      categoryChart,
      'Grafico indisponivel para esta exportacao.'
    ),
    CASHFLOW_CHART_SECTION: buildChartSectionMarkup(
      'Entradas vs saidas',
      cashFlowChart,
      'Abra o dashboard antes de exportar para incluir este grafico.'
    ),
    TRANSACTION_ROWS: buildReportRowsMarkup(transactions),
  });
}

function buildReportFileName(month) {
  return `relatorio_financeiro_${normalizeMonthKey(month)}.pdf`;
}

async function generateReportPdf(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '70px', right: '24px', bottom: '58px', left: '24px' },
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="width:100%;font-size:9px;padding:0 24px;color:#64748b;"><span>Relatorio Financeiro</span></div>',
      footerTemplate:
        '<div style="width:100%;font-size:9px;padding:0 24px;color:#94a3b8;display:flex;justify-content:space-between;"><span>Gestao de Gastos</span><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    });
  } finally {
    await browser.close();
  }
}

function getDashboardPayload(db, userId, selectedMonth) {
  const currentMonth = normalizeMonthKey(selectedMonth);
  const allTransactions = getFilteredTransactions(db, userId, {});
  const monthTransactions = getFilteredTransactions(db, userId, { month: currentMonth });
  const [year, month] = currentMonth.split('-').map(Number);
  const previousDate = new Date(Date.UTC(year, month - 2, 1));
  const previousMonthKey = `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const previousMonthTransactions = getFilteredTransactions(db, userId, { month: previousMonthKey });
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
    label: formatMonthLabel(currentMonth),
    summary: currentSummary,
    latestTransactions,
    categoryBreakdown: buildCategoryBreakdown(monthTransactions),
    monthlySeries: buildMonthlySeries(monthTransactions).slice(-6),
    welcome: {
      totalExpenses: currentSummary.expense,
      insight,
    },
  };
}

async function handleApi(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = parsedUrl.pathname;
  const transactionMatch = route.match(/^\/api\/transactions\/(\d+)$/);
  const investmentMatch = route.match(/^\/api\/investments\/(\d+)$/);
  const goalMatch = route.match(/^\/api\/goals\/(\d+)$/);
  const db = lerBancoDados();
  hydrateDatabase(db);

  if (req.method === 'POST' && route === '/api/register') {
    const { name, email, password, confirmPassword } = await parseBody(req);
    if (!name || !email || !password || !confirmPassword) {
      sendJson(res, 400, { message: 'Nome, email, senha e confirmação de senha são obrigatórios.' });
      return;
    }

    if (!normalizeUserName(name, '')) {
      sendJson(res, 400, { message: 'Informe seu nome completo.' });
      return;
    }

    if (!isValidEmail(email)) {
      sendJson(res, 400, { message: 'Informe um email válido.' });
      return;
    }

    if (!validatePasswordStrength(password)) {
      sendJson(res, 400, { message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (String(password) !== String(confirmPassword)) {
      sendJson(res, 400, { message: 'A confirmação de senha deve ser igual à senha informada.' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = getUserByEmail(db, normalizedEmail);
    if (existingUser) {
      if (isUserVerified(existingUser)) {
        sendJson(res, 409, { message: 'Email já cadastrado.' });
        return;
      }

      existingUser.name = normalizeUserName(name);
      existingUser.passwordHash = hashPassword(String(password));
      const payload = await issueRegistrationOtp(db, {
        userId: existingUser.id,
        email: existingUser.email,
      });
      escreverBancoDados(db);
      sendJson(res, 200, payload);
      return;
    }

    const pendingUser = getPendingUserByEmail(db, normalizedEmail);
    const registration = {
      id: pendingUser?.id || db.counters.pendingUserId++,
      name: normalizeUserName(name),
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      createdAt: pendingUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (pendingUser) {
      Object.assign(pendingUser, registration);
    } else {
      db.pendingUsers.push(registration);
    }

    const payload = await issueRegistrationOtp(db, {
      pendingUserId: registration.id,
      email: registration.email,
    });
    escreverBancoDados(db);
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
      token: buildSessionToken(user),
      user: {
        name: user.name,
        email: user.email,
      },
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

    const normalizedEmail = normalizeEmail(email);
    const pendingUser = getPendingUserByEmail(db, normalizedEmail);
    const user = getUserByEmail(db, normalizedEmail);
    const currentOtp = getLatestOtpForEmail(db, normalizedEmail);

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

    if (pendingUser) {
      db.users.push({
        id: db.counters.userId++,
        name: pendingUser.name,
        email: pendingUser.email,
        passwordHash: pendingUser.passwordHash,
        isVerified: true,
        createdAt: new Date().toISOString(),
      });
      db.pendingUsers = db.pendingUsers.filter((entry) => entry.id !== pendingUser.id);
    } else if (user) {
      user.isVerified = true;
    } else {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    escreverBancoDados(db);
    sendJson(res, 200, {
      message: 'Cadastro confirmado com sucesso. Agora você pode fazer login.',
    });
    return;
  }

  if (req.method === 'GET' && route === '/perfil') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user || !isUserVerified(user)) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const expenseTotal = db.transactions
      .filter((entry) => entry.userId === user.id && entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    sendJson(res, 200, {
      name: user.name,
      email: user.email,
      foto: buildPhotoUrl(user.photo, user.photoUpdatedAt),
      summary: {
        totalExpenses: Number(expenseTotal.toFixed(2)),
        transactionsCount: db.transactions.filter((entry) => entry.userId === user.id).length,
      },
    });
    return;
  }

  if (req.method === 'PUT' && route === '/perfil') {
    const { email, name } = await parseBody(req);
    const user = getUserByEmail(db, email);
    if (!user || !isUserVerified(user)) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const normalizedName = normalizeUserName(name, '');
    if (!normalizedName) {
      sendJson(res, 400, { message: 'Informe um nome válido.' });
      return;
    }

    user.name = normalizedName;
    escreverBancoDados(db);
    sendJson(res, 200, {
      message: 'Nome atualizado com sucesso.',
      user: {
        name: user.name,
        email: user.email,
        foto: buildPhotoUrl(user.photo, user.photoUpdatedAt),
      },
    });
    return;
  }

  if (req.method === 'POST' && route === '/perfil/foto') {
    let payload;
    try {
      payload = await parseMultipartFormData(req);
    } catch (error) {
      sendJson(res, error.statusCode || 400, { message: error.message || 'Não foi possível processar a imagem.' });
      return;
    }

    const user = getUserByEmail(db, payload.fields.email);
    if (!user || !isUserVerified(user)) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const photoFile = payload.files.find((file) => file.fieldName === 'photo');
    if (!photoFile) {
      sendJson(res, 400, { message: 'Selecione uma imagem para enviar.' });
      return;
    }

    if (!TIPOS_PERMITIDOS_FOTO_PERFIL[photoFile.mimeType]) {
      sendJson(res, 400, { message: 'Envie apenas imagens JPG, JPEG ou PNG.' });
      return;
    }

    if (!photoFile.buffer.length || photoFile.buffer.length > TAMANHO_MAXIMO_FOTO_PERFIL) {
      sendJson(res, 400, { message: 'A imagem deve ter no máximo 2MB.' });
      return;
    }

    ensureUploadsDir();
    const extension = TIPOS_PERMITIDOS_FOTO_PERFIL[photoFile.mimeType];
    const fileName = `perfil-${user.id}-${Date.now()}-${crypto.randomUUID()}${extension}`;
    const publicPath = `/uploads/${fileName}`;
    fs.writeFileSync(path.join(DIRETORIO_UPLOADS, fileName), photoFile.buffer);
    removeStoredPhoto(user.photo);
    user.photo = publicPath;
    user.photoUpdatedAt = new Date().toISOString();
    escreverBancoDados(db);

    sendJson(res, 200, {
      message: 'Foto atualizada com sucesso.',
      foto: buildPhotoUrl(user.photo, user.photoUpdatedAt),
    });
    return;
  }

  if (req.method === 'DELETE' && route === '/perfil/foto') {
    const { email } = await parseBody(req);
    const user = getUserByEmail(db, email);
    if (!user || !isUserVerified(user)) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    removeStoredPhoto(user.photo);
    user.photo = '';
    user.photoUpdatedAt = new Date().toISOString();
    escreverBancoDados(db);

    sendJson(res, 200, {
      message: 'Foto removida com sucesso.',
      foto: buildPhotoUrl(user.photo, user.photoUpdatedAt),
    });
    return;
  }

  if (req.method === 'PUT' && route === '/perfil/senha') {
    const { email, currentPassword, newPassword, confirmPassword } = await parseBody(req);
    const user = getUserByEmail(db, email);
    if (!user || !isUserVerified(user)) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      sendJson(res, 400, { message: 'Preencha a senha atual, a nova senha e a confirmação.' });
      return;
    }

    if (!verifyPassword(String(currentPassword), user.passwordHash)) {
      sendJson(res, 401, { message: 'A senha atual está incorreta.' });
      return;
    }

    if (!validatePasswordStrength(newPassword)) {
      sendJson(res, 400, { message: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (String(newPassword) !== String(confirmPassword)) {
      sendJson(res, 400, { message: 'A confirmação da nova senha não confere.' });
      return;
    }

    user.passwordHash = hashPassword(String(newPassword));
    escreverBancoDados(db);
    sendJson(res, 200, { message: 'Senha atualizada com sucesso.' });
    return;
  }

  if (req.method === 'GET' && route === '/api/categories') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    escreverBancoDados(db);
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

    escreverBancoDados(db);
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
    escreverBancoDados(db);
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

    escreverBancoDados(db);
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
      escreverBancoDados(db);
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
    escreverBancoDados(db);
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
    escreverBancoDados(db);
    sendJson(res, 200, getDashboardPayload(db, user.id, parsedUrl.searchParams.get('month')));
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
    escreverBancoDados(db);
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
    escreverBancoDados(db);
    sendJson(res, 200, {
      summary: buildInvestmentSummary(investments),
      evolution: buildInvestmentEvolution(investments),
      investments,
    });
    return;
  }

  if (req.method === 'POST' && route === '/api/goals') {
    const { email, name, targetAmount, currentAmount, deadline, category } = await parseBody(req);
    const user = getUserByEmail(db, email);
    const numericTarget = Number(targetAmount);
    const numericCurrent = Number(currentAmount || 0);

    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    if (!normalizeText(name)) {
      sendJson(res, 400, { message: 'Informe um nome para a meta.' });
      return;
    }

    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      sendJson(res, 400, { message: 'Informe um valor alvo válido.' });
      return;
    }

    if (!Number.isFinite(numericCurrent) || numericCurrent < 0) {
      sendJson(res, 400, { message: 'Informe um valor atual válido.' });
      return;
    }

    db.goals.push({
      id: db.counters.goalId++,
      userId: user.id,
      name: normalizeText(name),
      targetAmount: Number(numericTarget.toFixed(2)),
      currentAmount: Number(numericCurrent.toFixed(2)),
      deadline: normalizeDate(deadline),
      category: normalizeCategoryName(category || ''),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    db.goals = db.goals.map((entry) => normalizeGoal(entry.userId, entry));
    escreverBancoDados(db);
    sendJson(res, 201, { message: 'Meta criada com sucesso.' });
    return;
  }

  if (req.method === 'GET' && route === '/api/goals') {
    const user = getUserByEmail(db, parsedUrl.searchParams.get('email'));
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const status = parsedUrl.searchParams.get('status') || 'all';
    const goals = getFilteredGoals(db, user.id, status);
    escreverBancoDados(db);
    sendJson(res, 200, {
      summary: buildGoalsSummary(db.goals.filter((goal) => goal.userId === user.id)),
      goals,
    });
    return;
  }

  if ((req.method === 'PUT' || req.method === 'DELETE') && goalMatch) {
    const goalId = Number(goalMatch[1]);
    const data = req.method === 'DELETE' ? { email: parsedUrl.searchParams.get('email') } : await parseBody(req);
    const user = getUserByEmail(db, data.email);

    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const index = db.goals.findIndex((entry) => entry.id === goalId && entry.userId === user.id);
    if (index === -1) {
      sendJson(res, 404, { message: 'Meta não encontrada.' });
      return;
    }

    if (req.method === 'DELETE') {
      db.goals.splice(index, 1);
      escreverBancoDados(db);
      sendJson(res, 200, { message: 'Meta removida com sucesso.' });
      return;
    }

    const existing = db.goals[index];
    const nextTarget = data.targetAmount !== undefined ? Number(data.targetAmount) : existing.targetAmount;
    const nextCurrent = data.currentAmount !== undefined ? Number(data.currentAmount) : existing.currentAmount;

    if (!normalizeText(data.name ?? existing.name)) {
      sendJson(res, 400, { message: 'Informe um nome válido para a meta.' });
      return;
    }

    if (!Number.isFinite(nextTarget) || nextTarget <= 0) {
      sendJson(res, 400, { message: 'Informe um valor alvo válido.' });
      return;
    }

    if (!Number.isFinite(nextCurrent) || nextCurrent < 0) {
      sendJson(res, 400, { message: 'Informe um valor atual válido.' });
      return;
    }

    db.goals[index] = normalizeGoal(user.id, {
      ...existing,
      name: data.name ?? existing.name,
      targetAmount: nextTarget,
      currentAmount: nextCurrent,
      deadline: data.deadline ?? existing.deadline,
      category: data.category ?? existing.category,
      status: data.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    });

    escreverBancoDados(db);
    sendJson(res, 200, { message: 'Meta atualizada com sucesso.', goal: db.goals[index] });
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
      escreverBancoDados(db);
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
    escreverBancoDados(db);
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
    escreverBancoDados(db);
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

    escreverBancoDados(db);
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
    const transactions = getFilteredTransactions(db, user.id, { month: report.payload.month });
    escreverBancoDados(db);
    sendHtml(res, 200, buildReportHtml(user, report, transactions));
    return;
  }

  if ((req.method === 'GET' || req.method === 'POST') && route === '/relatorios/pdf') {
    const payload = req.method === 'POST' ? await parseBody(req) : {};
    const email = payload.email || parsedUrl.searchParams.get('email');
    const user = getUserByEmail(db, email);
    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const month = payload.month || parsedUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const report = ensureStoredReport(db, user, month);
    const transactions = getFilteredTransactions(db, user.id, { month: report.payload.month });
    const html = buildPdfHtml(user, report, transactions, {
      category: payload.charts?.category || parsedUrl.searchParams.get('categoryChart') || '',
      cashFlow: payload.charts?.cashFlow || parsedUrl.searchParams.get('cashFlowChart') || '',
    });
    const pdfBuffer = await generateReportPdf(html);

    escreverBancoDados(db);
    sendPdf(res, pdfBuffer, buildReportFileName(report.payload.month));
    return;
  }

  sendJson(res, 404, { message: 'Endpoint não encontrado.' });
}

garantirBancoDados();

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
    if (
      pathname.startsWith('/api/') ||
      pathname === '/perfil' ||
      pathname === '/perfil/senha' ||
      pathname === '/perfil/foto' ||
      pathname === '/relatorios/pdf'
    ) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    console.error('Erro interno:', error);
    sendJson(res, 500, { message: 'Erro interno no servidor.' });
  }
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(
      `A porta ${PORTA} ja esta em uso. Encerre o processo que esta usando essa porta ou inicie com outra, por exemplo: $env:PORTA=3001; node server.js`
    );
    process.exit(1);
  }

  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});

server.listen(PORTA, () => {
  ensureUploadsDir();
  console.log(`Servidor executando em http://localhost:${PORTA}`);
});

