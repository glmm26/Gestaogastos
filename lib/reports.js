const fs = require('fs');
const puppeteer = require('puppeteer');
const { CAMINHO_TEMPLATE_RELATORIO_PDF } = require('./config');
const { getMonthKey, normalizeMonthKey } = require('./validation');
const { formatMonthLabel, formatCurrencyBRL, formatDateBR, formatDateTimeBR, escapeHtml, sanitizeBase64Image } = require('./format');
const {
  filterTransactions,
  buildTransactionSummary,
  buildCategoryBreakdown,
  buildInvestmentSummary,
  buildInsights,
  hydrateInvestment,
} = require('./analytics');
const transactionsRepo = require('../db/repositories/transactions');
const investmentsRepo = require('../db/repositories/investments');
const reportsRepo = require('../db/repositories/reports');

function getMonthTransactions(db, userId, month) {
  const all = transactionsRepo.listTransactionsByUser(db, userId);
  return filterTransactions(all, { month });
}

function getMonthInvestments(db, userId, month) {
  return investmentsRepo
    .listInvestmentsByUser(db, userId)
    .filter((entry) => getMonthKey(entry.date) === month)
    .map(hydrateInvestment)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildReportPayload(db, userId, month) {
  const reportMonth = month || new Date().toISOString().slice(0, 7);
  const transactions = getMonthTransactions(db, userId, reportMonth);
  const investments = getMonthInvestments(db, userId, reportMonth);

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

function ensureStoredReport(db, userId, month) {
  const payload = buildReportPayload(db, userId, month);
  return reportsRepo.upsertReport(db, { userId, month: payload.month, payload });
}

function refreshAutomaticReports(db, userId) {
  const months = new Set();

  transactionsRepo.listTransactionsByUser(db, userId).forEach((entry) => months.add(getMonthKey(entry.date)));
  investmentsRepo.listInvestmentsByUser(db, userId).forEach((entry) => months.add(getMonthKey(entry.date)));
  months.add(new Date().toISOString().slice(0, 7));

  Array.from(months).forEach((month) => ensureStoredReport(db, userId, month));
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

function buildReportHtml(user, report, transactions = []) {
  return buildPdfHtml(user, report, transactions, {});
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

module.exports = {
  buildReportPayload,
  ensureStoredReport,
  refreshAutomaticReports,
  buildReportHtml,
  buildPdfHtml,
  buildReportFileName,
  generateReportPdf,
  getMonthTransactions,
};
