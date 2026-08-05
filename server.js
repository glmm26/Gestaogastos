require('./lib/loadEnv');

const http = require('http');
const { PORTA } = require('./lib/config');
const { sendJson } = require('./lib/http');
const { serveStatic } = require('./lib/staticServer');
const { ensureUploadsDir } = require('./lib/photos');
const { getDb } = require('./db/connection');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const categoriesRoutes = require('./routes/categories');
const transactionsRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const goalsRoutes = require('./routes/goals');
const investmentsRoutes = require('./routes/investments');
const reportsRoutes = require('./routes/reports');

const ROUTE_MODULES = [
  authRoutes,
  profileRoutes,
  categoriesRoutes,
  transactionsRoutes,
  dashboardRoutes,
  goalsRoutes,
  investmentsRoutes,
  reportsRoutes,
];

async function handleApi(req, res, db) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = parsedUrl.pathname;
  const ctx = {
    req,
    res,
    db,
    method: req.method,
    route,
    parsedUrl,
    transactionMatch: route.match(/^\/api\/transactions\/(\d+)$/),
    investmentMatch: route.match(/^\/api\/investments\/(\d+)$/),
    goalMatch: route.match(/^\/api\/goals\/(\d+)$/),
  };

  for (const routeModule of ROUTE_MODULES) {
    // eslint-disable-next-line no-await-in-loop
    const handled = await routeModule.handle(ctx);
    if (handled) return;
  }

  sendJson(res, 404, { message: 'Endpoint não encontrado.' });
}

const db = getDb();

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
      await handleApi(req, res, db);
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
