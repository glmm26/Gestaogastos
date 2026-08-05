const { sendJson, sendHtml, sendPdf, parseBody } = require('../lib/http');
const { requireAuth } = require('../lib/session');
const reportsRepo = require('../db/repositories/reports');
const {
  ensureStoredReport,
  refreshAutomaticReports,
  buildReportHtml,
  buildPdfHtml,
  buildReportFileName,
  generateReportPdf,
  getMonthTransactions,
} = require('../lib/reports');

async function handle({ req, res, db, method, route, parsedUrl }) {
  if (method === 'POST' && route === '/api/reports/generate') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const { month } = await parseBody(req);
    const report = ensureStoredReport(db, user.id, month);
    sendJson(res, 201, { message: 'Relatório gerado com sucesso.', report: report.payload });
    return true;
  }

  if (method === 'GET' && route === '/api/reports') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    refreshAutomaticReports(db, user.id);
    const selectedMonth = parsedUrl.searchParams.get('month');
    const selectedReport = selectedMonth
      ? ensureStoredReport(db, user.id, selectedMonth)
      : ensureStoredReport(db, user.id, new Date().toISOString().slice(0, 7));

    const reports = reportsRepo.listReportsByUser(db, user.id);

    sendJson(res, 200, {
      reports: reports.map((entry) => entry.payload),
      selectedReport: selectedReport.payload,
    });
    return true;
  }

  if (method === 'GET' && route === '/api/reports/export') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const month = parsedUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const report = ensureStoredReport(db, user.id, month);
    const transactions = getMonthTransactions(db, user.id, report.payload.month);
    sendHtml(res, 200, buildReportHtml(user, report, transactions));
    return true;
  }

  if ((method === 'GET' || method === 'POST') && route === '/relatorios/pdf') {
    const user = requireAuth(db, req, res);
    if (!user) return true;

    const payload = method === 'POST' ? await parseBody(req) : {};
    const month = payload.month || parsedUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const report = ensureStoredReport(db, user.id, month);
    const transactions = getMonthTransactions(db, user.id, report.payload.month);
    const html = buildPdfHtml(user, report, transactions, {
      category: payload.charts?.category || parsedUrl.searchParams.get('categoryChart') || '',
      cashFlow: payload.charts?.cashFlow || parsedUrl.searchParams.get('cashFlowChart') || '',
    });
    const pdfBuffer = await generateReportPdf(html);

    sendPdf(res, pdfBuffer, buildReportFileName(report.payload.month));
    return true;
  }

  return false;
}

module.exports = { handle };
