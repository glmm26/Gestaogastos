const fs = require('fs');
const path = require('path');
const { DIRETORIO_PUBLICO, DIRETORIO_UPLOADS } = require('./config');
const { sendJson } = require('./http');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

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
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
  res.end(content);
}

module.exports = { serveStatic };
