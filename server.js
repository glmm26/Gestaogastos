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
  if (req.method === 'POST' && req.url === '/api/register') {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha são obrigatórios.' });
      return;
    }

    const db = readDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = db.users.find((user) => user.email === normalizedEmail);
    if (exists) {
      sendJson(res, 409, { message: 'Email já cadastrado.' });
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

  if (req.method === 'POST' && req.url === '/api/login') {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha são obrigatórios.' });
      return;
    }

    const db = readDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((entry) => entry.email === normalizedEmail);

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      sendJson(res, 401, { message: 'Credenciais inválidas.' });
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

  if (req.method === 'POST' && req.url === '/api/verify-otp') {
    const { email, otp } = await parseBody(req);
    if (!email || !otp) {
      sendJson(res, 400, { message: 'Email e OTP são obrigatórios.' });
      return;
    }

    const db = readDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((entry) => entry.email === normalizedEmail);

    if (!user) {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return;
    }

    const userOtps = db.otps
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
    writeDatabase(db);
    sendJson(res, 200, {
      message: 'Login validado com sucesso.',
      token: `demo-token-${user.id}-${Date.now()}`,
    });
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
