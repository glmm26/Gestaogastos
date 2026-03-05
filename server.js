const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureDatabase, readDatabase, writeDatabase } = require('./db');

const PORT = process.env.PORT || 3000;
const OTP_EXPIRATION_MINUTES = 5;
const PUBLIC_DIR = path.join(__dirname, 'public');

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
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
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

async function handleApi(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = parsedUrl.pathname;

  if (req.method === 'POST' && route === '/api/register') {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha sao obrigatorios.' });
      return;
    }

    const db = readDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = db.users.find((user) => user.email === normalizedEmail);
    if (exists) {
      sendJson(res, 409, { message: 'Email ja cadastrado.' });
      return;
    }

    const user = {
      id: db.counters.userId++,
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    writeDatabase(db);
    sendJson(res, 201, { message: 'Cadastro realizado com sucesso.' });
    return;
  }

  if (req.method === 'POST' && route === '/api/login') {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha sao obrigatorios.' });
      return;
    }

    const db = readDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((entry) => entry.email === normalizedEmail);

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      sendJson(res, 401, { message: 'Credenciais invalidas.' });
      return;
    }

    db.otps = db.otps.map((entry) =>
      entry.userId === user.id && entry.used === false ? { ...entry, used: true } : entry
    );

    const otp = generateOtp();
    const otpRow = {
      id: db.counters.otpId++,
      userId: user.id,
      code: otp,
      expiresAt: new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    };

    db.otps.push(otpRow);
    writeDatabase(db);

    console.log(`OTP para ${user.email}: ${otp}`);
    sendJson(res, 200, {
      message: `OTP gerado. Validade de ${OTP_EXPIRATION_MINUTES} minutos.`,
      devOtp: otp,
    });
    return;
  }

  if (req.method === 'POST' && route === '/api/verify-otp') {
    const { email, otp } = await parseBody(req);
    if (!email || !otp) {
      sendJson(res, 400, { message: 'Email e OTP sao obrigatorios.' });
      return;
    }

    const db = readDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((entry) => entry.email === normalizedEmail);

    if (!user) {
      sendJson(res, 404, { message: 'Usuario nao encontrado.' });
      return;
    }

    const userOtps = db.otps
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const currentOtp = userOtps[0];
    if (!currentOtp || currentOtp.used) {
      sendJson(res, 401, { message: 'OTP invalido ou ja utilizado.' });
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
    writeDatabase(db);
    sendJson(res, 200, {
      message: 'Login validado com sucesso.',
      token: `demo-token-${user.id}-${Date.now()}`,
    });
    return;
  }

  if (req.method === 'POST' && route === '/api/transactions') {
    const { email, type, amount, description } = await parseBody(req);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedType = String(type || '').trim().toLowerCase();
    const normalizedDescription = String(description || '').trim() || 'Movimentacao';
    const numericAmount = Number(amount);

    if (!normalizedEmail || !['income', 'expense'].includes(normalizedType)) {
      sendJson(res, 400, { message: 'Email e tipo sao obrigatorios.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      sendJson(res, 400, { message: 'Valor invalido.' });
      return;
    }

    const db = readDatabase();
    const user = db.users.find((entry) => entry.email === normalizedEmail);
    if (!user) {
      sendJson(res, 404, { message: 'Usuario nao encontrado.' });
      return;
    }

    const tx = {
      id: db.counters.transactionId++,
      userId: user.id,
      type: normalizedType,
      amount: Number(numericAmount.toFixed(2)),
      description: normalizedDescription.slice(0, 120),
      createdAt: new Date().toISOString(),
    };

    db.transactions.push(tx);
    writeDatabase(db);
    sendJson(res, 201, { message: 'Movimentacao adicionada com sucesso.' });
    return;
  }

  if (req.method === 'GET' && route === '/api/transactions') {
    const normalizedEmail = String(parsedUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!normalizedEmail) {
      sendJson(res, 400, { message: 'Email e obrigatorio.' });
      return;
    }

    const db = readDatabase();
    const user = db.users.find((entry) => entry.email === normalizedEmail);
    if (!user) {
      sendJson(res, 404, { message: 'Usuario nao encontrado.' });
      return;
    }

    const userTransactions = db.transactions
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const income = db.transactions
      .filter((entry) => entry.userId === user.id && entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expense = db.transactions
      .filter((entry) => entry.userId === user.id && entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    sendJson(res, 200, {
      summary: {
        income,
        expense,
        balance: income - expense,
      },
      transactions: userTransactions,
    });
    return;
  }

  sendJson(res, 404, { message: 'Endpoint nao encontrado.' });
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
