const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendJson, parseBody, parseMultipartFormData } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const { hashPassword, verifyPassword } = require('../lib/auth');
const { normalizeUserName, validatePasswordStrength } = require('../lib/validation');
const { buildPhotoUrl, ensureUploadsDir, removeStoredPhoto } = require('../lib/photos');
const { DIRETORIO_UPLOADS, TAMANHO_MAXIMO_FOTO_PERFIL, TIPOS_PERMITIDOS_FOTO_PERFIL } = require('../lib/config');
const usersRepo = require('../db/repositories/users');
const transactionsRepo = require('../db/repositories/transactions');

async function handle({ req, res, db, method, route }) {
  if (method === 'GET' && route === '/perfil') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const transactions = transactionsRepo.listTransactionsByUser(db, user.id);
    const expenseTotal = transactions
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    sendJson(res, 200, {
      name: user.name,
      email: user.email,
      foto: buildPhotoUrl(user.photo, user.photoUpdatedAt),
      summary: {
        totalExpenses: Number(expenseTotal.toFixed(2)),
        transactionsCount: transactions.length,
      },
    });
    return true;
  }

  if (method === 'PUT' && route === '/perfil') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { name } = await parseBody(req);
    const normalizedName = normalizeUserName(name, '');
    if (!normalizedName) {
      sendJson(res, 400, { message: 'Informe um nome válido.' });
      return true;
    }

    usersRepo.updateUserName(db, user.id, normalizedName);
    sendJson(res, 200, {
      message: 'Nome atualizado com sucesso.',
      user: { name: normalizedName, email: user.email, foto: buildPhotoUrl(user.photo, user.photoUpdatedAt) },
    });
    return true;
  }

  if (method === 'POST' && route === '/perfil/foto') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    let payload;
    try {
      payload = await parseMultipartFormData(req, TAMANHO_MAXIMO_FOTO_PERFIL + 1024 * 200);
    } catch (error) {
      sendJson(res, error.statusCode || 400, { message: error.message || 'Não foi possível processar a imagem.' });
      return true;
    }

    const photoFile = payload.files.find((file) => file.fieldName === 'photo');
    if (!photoFile) {
      sendJson(res, 400, { message: 'Selecione uma imagem para enviar.' });
      return true;
    }

    if (!TIPOS_PERMITIDOS_FOTO_PERFIL[photoFile.mimeType]) {
      sendJson(res, 400, { message: 'Envie apenas imagens JPG, JPEG ou PNG.' });
      return true;
    }

    if (!photoFile.buffer.length || photoFile.buffer.length > TAMANHO_MAXIMO_FOTO_PERFIL) {
      sendJson(res, 400, { message: 'A imagem deve ter no máximo 2MB.' });
      return true;
    }

    ensureUploadsDir();
    const extension = TIPOS_PERMITIDOS_FOTO_PERFIL[photoFile.mimeType];
    const fileName = `perfil-${user.id}-${Date.now()}-${crypto.randomUUID()}${extension}`;
    const publicPath = `/uploads/${fileName}`;
    fs.writeFileSync(path.join(DIRETORIO_UPLOADS, fileName), photoFile.buffer);
    removeStoredPhoto(user.photo);
    const photoUpdatedAt = new Date().toISOString();
    usersRepo.updateUserPhoto(db, user.id, publicPath, photoUpdatedAt);

    sendJson(res, 200, {
      message: 'Foto atualizada com sucesso.',
      foto: buildPhotoUrl(publicPath, photoUpdatedAt),
    });
    return true;
  }

  if (method === 'DELETE' && route === '/perfil/foto') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    removeStoredPhoto(user.photo);
    const photoUpdatedAt = new Date().toISOString();
    usersRepo.updateUserPhoto(db, user.id, '', photoUpdatedAt);

    sendJson(res, 200, { message: 'Foto removida com sucesso.', foto: buildPhotoUrl('', photoUpdatedAt) });
    return true;
  }

  if (method === 'PUT' && route === '/perfil/senha') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { currentPassword, newPassword, confirmPassword } = await parseBody(req);
    if (!currentPassword || !newPassword || !confirmPassword) {
      sendJson(res, 400, { message: 'Preencha a senha atual, a nova senha e a confirmação.' });
      return true;
    }

    if (!verifyPassword(String(currentPassword), user.passwordHash)) {
      sendJson(res, 401, { message: 'A senha atual está incorreta.' });
      return true;
    }

    if (!validatePasswordStrength(newPassword)) {
      sendJson(res, 400, { message: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return true;
    }

    if (String(newPassword) !== String(confirmPassword)) {
      sendJson(res, 400, { message: 'A confirmação da nova senha não confere.' });
      return true;
    }

    usersRepo.updateUserPassword(db, user.id, hashPassword(String(newPassword)));
    sendJson(res, 200, { message: 'Senha atualizada com sucesso.' });
    return true;
  }

  return false;
}

module.exports = { handle };
