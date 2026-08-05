const { sendJson, parseBody } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const { normalizeCategoryName } = require('../lib/validation');
const categoriesRepo = require('../db/repositories/categories');

async function handle({ req, res, db, method, route }) {
  if (method === 'GET' && route === '/api/categories') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    sendJson(res, 200, { categories: categoriesRepo.getUserCategories(db, user.id) });
    return true;
  }

  if (method === 'POST' && route === '/api/categories') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { name } = await parseBody(req);
    const normalized = normalizeCategoryName(name);
    if (!normalized) {
      sendJson(res, 400, { message: 'Informe uma categoria válida.' });
      return true;
    }

    categoriesRepo.ensureCategory(db, user.id, normalized);
    sendJson(res, 201, {
      message: 'Categoria cadastrada com sucesso.',
      categories: categoriesRepo.getUserCategories(db, user.id),
    });
    return true;
  }

  return false;
}

module.exports = { handle };
