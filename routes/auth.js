const { sendJson, parseBody } = require('../lib/http');
const { hashPassword, verifyPassword, generateOtp } = require('../lib/auth');
const { MINUTOS_EXPIRACAO_OTP, sendOtpEmail } = require('../lib/email');
const { createSessionCookie, clearSessionCookie, getAuthenticatedUser } = require('../lib/session');
const { rateLimit, getClientKey } = require('../lib/rateLimit');
const {
  normalizeUserName,
  normalizeEmail,
  isValidEmail,
  validatePasswordStrength,
} = require('../lib/validation');
const usersRepo = require('../db/repositories/users');
const pendingUsersRepo = require('../db/repositories/pendingUsers');
const otpsRepo = require('../db/repositories/otps');

async function issueRegistrationOtp(db, { email, userId, pendingUserId }) {
  const normalizedEmail = normalizeEmail(email);
  otpsRepo.invalidatePendingOtps(db, normalizedEmail);

  const otp = generateOtp();
  otpsRepo.createOtp(db, {
    email: normalizedEmail,
    code: otp,
    userId: userId || null,
    pendingUserId: pendingUserId || null,
    expiresAt: new Date(Date.now() + MINUTOS_EXPIRACAO_OTP * 60 * 1000).toISOString(),
  });

  let emailSent = false;
  let deliveryWarning = '';

  try {
    await sendOtpEmail(normalizedEmail, otp);
    emailSent = true;
  } catch (error) {
    deliveryWarning = error.message;
    console.error(`Falha ao enviar OTP para ${normalizedEmail}: ${error.message}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!emailSent) {
    console.log(`OTP de desenvolvimento para ${normalizedEmail}: ${otp}`);
  }

  return {
    message: emailSent
      ? `Código de cadastro enviado para ${normalizedEmail}. Validade de ${MINUTOS_EXPIRACAO_OTP} minutos.`
      : isProduction
        ? 'Não foi possível enviar o código por email agora. Tente novamente em alguns minutos.'
        : 'Código de cadastro gerado. Como o envio por email não está disponível, use o código de desenvolvimento.',
    devOtp: !emailSent && !isProduction ? otp : undefined,
    deliveryWarning: !emailSent && !isProduction ? deliveryWarning : undefined,
  };
}

const LIMITE_TENTATIVAS_AUTH = { max: 10, windowMs: 5 * 60 * 1000 };

function isRateLimited(req, bucket) {
  return !rateLimit(`${bucket}:${getClientKey(req)}`, LIMITE_TENTATIVAS_AUTH);
}

async function handle({ req, res, db, method, route }) {
  if (method === 'POST' && route === '/api/register') {
    if (isRateLimited(req, 'register')) {
      sendJson(res, 429, { message: 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.' });
      return true;
    }

    const { name, email, password, confirmPassword } = await parseBody(req);
    if (!name || !email || !password || !confirmPassword) {
      sendJson(res, 400, { message: 'Nome, email, senha e confirmação de senha são obrigatórios.' });
      return true;
    }

    if (!normalizeUserName(name, '')) {
      sendJson(res, 400, { message: 'Informe seu nome completo.' });
      return true;
    }

    if (!isValidEmail(email)) {
      sendJson(res, 400, { message: 'Informe um email válido.' });
      return true;
    }

    if (!validatePasswordStrength(password)) {
      sendJson(res, 400, { message: 'A senha deve ter pelo menos 6 caracteres.' });
      return true;
    }

    if (String(password) !== String(confirmPassword)) {
      sendJson(res, 400, { message: 'A confirmação de senha deve ser igual à senha informada.' });
      return true;
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = usersRepo.getUserByEmail(db, normalizedEmail);

    if (existingUser) {
      if (existingUser.isVerified) {
        sendJson(res, 409, { message: 'Email já cadastrado.' });
        return true;
      }

      usersRepo.updateUserNameAndPassword(db, existingUser.id, {
        name: normalizeUserName(name),
        passwordHash: hashPassword(String(password)),
      });
      const payload = await issueRegistrationOtp(db, { email: normalizedEmail, userId: existingUser.id });
      sendJson(res, 200, payload);
      return true;
    }

    const pendingUser = pendingUsersRepo.upsertPendingUser(db, {
      email: normalizedEmail,
      name: normalizeUserName(name),
      passwordHash: hashPassword(String(password)),
    });

    const payload = await issueRegistrationOtp(db, { email: normalizedEmail, pendingUserId: pendingUser.id });
    sendJson(res, 201, payload);
    return true;
  }

  if (method === 'POST' && route === '/api/login') {
    if (isRateLimited(req, 'login')) {
      sendJson(res, 429, { message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' });
      return true;
    }

    const { email, password } = await parseBody(req);
    if (!email || !password) {
      sendJson(res, 400, { message: 'Email e senha são obrigatórios.' });
      return true;
    }

    const user = usersRepo.getUserByEmail(db, normalizeEmail(email));
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      sendJson(res, 401, { message: 'Credenciais inválidas.' });
      return true;
    }

    if (!user.isVerified) {
      sendJson(res, 403, {
        message: 'Você precisa confirmar o cadastro com o OTP enviado por email antes de fazer login.',
      });
      return true;
    }

    createSessionCookie(db, res, user.id);
    sendJson(res, 200, {
      message: 'Login realizado com sucesso.',
      user: { name: user.name, email: user.email },
    });
    return true;
  }

  if (
    method === 'POST' &&
    (route === '/api/verify-otp' || route === '/api/verify-email' || route === '/api/email-verificacao')
  ) {
    if (isRateLimited(req, 'verify-otp')) {
      sendJson(res, 429, { message: 'Muitas tentativas de verificação. Aguarde alguns minutos e tente novamente.' });
      return true;
    }

    const { email, otp } = await parseBody(req);
    if (!email || !otp) {
      sendJson(res, 400, { message: 'Email e OTP são obrigatórios.' });
      return true;
    }

    const normalizedEmail = normalizeEmail(email);
    const pendingUser = pendingUsersRepo.getPendingUserByEmail(db, normalizedEmail);
    const user = usersRepo.getUserByEmail(db, normalizedEmail);
    const currentOtp = otpsRepo.getLatestOtpForEmail(db, normalizedEmail);

    if (!currentOtp || currentOtp.used) {
      sendJson(res, 401, { message: 'OTP inválido ou já utilizado.' });
      return true;
    }

    if (new Date(currentOtp.expiresAt).getTime() < Date.now()) {
      sendJson(res, 401, { message: 'OTP expirado.' });
      return true;
    }

    if (String(otp).trim() !== currentOtp.code) {
      sendJson(res, 401, { message: 'OTP incorreto.' });
      return true;
    }

    otpsRepo.markOtpUsed(db, currentOtp.id);

    if (pendingUser) {
      usersRepo.createUser(db, {
        email: pendingUser.email,
        name: pendingUser.name,
        passwordHash: pendingUser.passwordHash,
        isVerified: true,
      });
      pendingUsersRepo.deletePendingUser(db, pendingUser.id);
    } else if (user) {
      usersRepo.markUserVerified(db, user.id);
    } else {
      sendJson(res, 404, { message: 'Usuário não encontrado.' });
      return true;
    }

    sendJson(res, 200, { message: 'Cadastro confirmado com sucesso. Agora você pode fazer login.' });
    return true;
  }

  if (method === 'POST' && route === '/api/logout') {
    clearSessionCookie(db, req, res);
    sendJson(res, 200, { message: 'Sessão encerrada.' });
    return true;
  }

  if (method === 'GET' && route === '/api/session') {
    const user = getAuthenticatedUser(db, req);
    if (!user) {
      sendJson(res, 401, { message: 'Sessão inválida ou expirada.' });
      return true;
    }
    sendJson(res, 200, { user: { name: user.name, email: user.email } });
    return true;
  }

  return false;
}

module.exports = { handle };
