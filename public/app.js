const splash = document.getElementById('splash');
const authScreen = document.getElementById('auth-screen');
const verifyScreen = document.getElementById('verify-screen');
const homeScreen = document.getElementById('home-screen');
const enterAppButton = document.getElementById('enter-app');
const splashProgressBar = document.getElementById('splash-progress-bar');

const tabRegister = document.getElementById('tab-register');
const tabLogin = document.getElementById('tab-login');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const verifyEmailForm = document.getElementById('verify-email-form');
const authMessage = document.getElementById('auth-message');
const verifyMessage = document.getElementById('verify-message');
const verifyEmailInput = document.getElementById('verify-email');
const otpDigits = Array.from(document.querySelectorAll('.otp-digit'));
const backToLoginButton = document.getElementById('back-to-login');
const authParticlesCanvas = document.getElementById('auth-particles');

const homeUserEmail = document.getElementById('home-user-email');
const logoutButton = document.getElementById('logout-button');
const refreshDataButton = document.getElementById('refresh-data');
const sectionTitle = document.getElementById('section-title');
const navButtons = Array.from(document.querySelectorAll('.nav-button'));
const appSections = Array.from(document.querySelectorAll('.app-section'));

const incomeTotal = document.getElementById('income-total');
const expenseTotal = document.getElementById('expense-total');
const balanceTotal = document.getElementById('balance-total');
const latestTransactionList = document.getElementById('latest-transaction-list');

const transactionForm = document.getElementById('transaction-form');
const transactionMessage = document.getElementById('transaction-message');
const transactionCategory = document.getElementById('transaction-category');
const customCategoryRow = document.getElementById('custom-category-row');
const customCategoryInput = document.getElementById('custom-category-input');
const newCategoryName = document.getElementById('new-category-name');
const addCategoryButton = document.getElementById('add-category-button');
const transactionSubmitButton = document.getElementById('transaction-submit-button');
const cancelTransactionEditButton = document.getElementById('cancel-transaction-edit');

const filtersForm = document.getElementById('filters-form');
const clearFiltersButton = document.getElementById('clear-filters');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterPeriod = document.getElementById('filter-period');
const filterStartDate = document.getElementById('filter-start-date');
const filterEndDate = document.getElementById('filter-end-date');
const transactionList = document.getElementById('transaction-list');
const filteredIncome = document.getElementById('filtered-income');
const filteredExpense = document.getElementById('filtered-expense');
const filteredBalance = document.getElementById('filtered-balance');
const filteredCount = document.getElementById('filtered-count');

const investmentForm = document.getElementById('investment-form');
const investmentMessage = document.getElementById('investment-message');
const investedTotal = document.getElementById('invested-total');
const profitLossTotal = document.getElementById('profit-loss-total');
const currentValueTotal = document.getElementById('current-value-total');
const investmentList = document.getElementById('investment-list');
const investmentSubmitButton = document.getElementById('investment-submit-button');
const cancelInvestmentEditButton = document.getElementById('cancel-investment-edit');
const investmentDetailPanel = document.getElementById('investment-detail-panel');
const selectedInvestmentProfile = document.getElementById('selected-investment-profile');
const selectedInvestmentAmount = document.getElementById('selected-investment-amount');
const selectedInvestmentYearsText = document.getElementById('selected-investment-years');
const selectedInvestmentProjected = document.getElementById('selected-investment-projected');
const investmentAmountInput = document.getElementById('investment-amount');
const riskProfileButtons = Array.from(document.querySelectorAll('[data-risk-profile]'));
const investmentYearsButtons = Array.from(document.querySelectorAll('[data-investment-years]'));
const riskProfileHelp = document.getElementById('risk-profile-help');
const investmentHeadline = document.getElementById('investment-headline');
const investmentSubheadline = document.getElementById('investment-subheadline');
const taxForm = document.getElementById('tax-form');
const clearTaxFormButton = document.getElementById('clear-tax-form');
const taxMessage = document.getElementById('tax-message');
const taxAnnualIncome = document.getElementById('tax-annual-income');
const taxBaseIncome = document.getElementById('tax-base-income');
const taxBracket = document.getElementById('tax-bracket');
const taxEstimated = document.getElementById('tax-estimated');
const taxNetIncome = document.getElementById('tax-net-income');
const taxHighlightValue = document.getElementById('tax-highlight-value');
const taxFeedbackPrimary = document.getElementById('tax-feedback-primary');
const taxFeedbackSecondary = document.getElementById('tax-feedback-secondary');
const taxSuggestions = document.getElementById('tax-suggestions');
const taxResultsPanel = document.getElementById('tax-results-panel');
const taxInsightsPanel = document.getElementById('tax-insights-panel');
const taxChartPanel = document.getElementById('tax-chart-panel');
const taxWarningModal = document.getElementById('tax-warning-modal');
const hideTaxWarningCheckbox = document.getElementById('hide-tax-warning');
const continueTaxWarningButton = document.getElementById('continue-tax-warning');
const backTaxWarningButton = document.getElementById('back-tax-warning');
const openTaxTipsButton = document.getElementById('open-tax-tips');
const taxTipsModal = document.getElementById('tax-tips-modal');
const closeTaxTipsButton = document.getElementById('close-tax-tips');

const reportForm = document.getElementById('report-form');
const reportMonthInput = document.getElementById('report-month');
const reportMessage = document.getElementById('report-message');
const exportReportButton = document.getElementById('export-report');
const reportsHistory = document.getElementById('reports-history');
const reportTitle = document.getElementById('report-title');
const reportIncome = document.getElementById('report-income');
const reportExpense = document.getElementById('report-expense');
const reportBalance = document.getElementById('report-balance');
const reportTransactionsCount = document.getElementById('report-transactions-count');
const reportTopCategories = document.getElementById('report-top-categories');
const reportInsights = document.getElementById('report-insights');

let pendingVerificationEmail = '';
let currentUserEmail = '';
let categoriesCache = [];
let selectedReportMonth = new Date().toISOString().slice(0, 7);
let editingTransactionId = null;
let editingInvestmentId = null;
let selectedInvestmentViewId = null;
let selectedRiskProfile = 'low';
let selectedInvestmentYears = 3;
let pendingSectionAfterWarning = null;
const chartInstances = {};
let authParticlesAnimationId = null;
let authParticlesState = null;
let splashTimerId = null;
let splashStartTime = 0;
let splashProgressAnimationId = null;

const SPLASH_DURATION_MS = 10000;

const TAX_WARNING_STORAGE_KEY = 'ocultarAvisoImposto';
const DEPENDENT_DEDUCTION = 2275.08;

const RISK_PROFILES = {
  low: {
    label: 'Baixo risco',
    annualRate: 8,
    help: 'Baixo risco: pensado para quem prefere mais estabilidade. Exemplos: Tesouro Selic, CDB com liquidez diaria e contas remuneradas. Estimativa de 8% ao ano.',
    examples: 'Tesouro Selic, CDB com liquidez diaria e contas remuneradas',
  },
  medium: {
    label: 'Medio risco',
    annualRate: 12,
    help: 'Medio risco: equilibrio entre seguranca e crescimento. Exemplos: fundos multimercado, ETFs amplos e carteira mista. Estimativa de 12% ao ano.',
    examples: 'fundos multimercado, ETFs amplos e carteira mista',
  },
  high: {
    label: 'Alto risco',
    annualRate: 18,
    help: 'Alto risco: mais oscilacao em troca de maior potencial. Exemplos: acoes, fundos de acoes e criptos para quem aceita variacao maior. Estimativa de 18% ao ano.',
    examples: 'acoes, fundos de acoes e criptos',
  },
};

function showMessage(element, text, type = '') {
  element.textContent = text;
  element.className = type ? `message ${type}` : 'message';
}

function showAuthMessage(text, type = '') {
  showMessage(authMessage, text, type);
}

function showVerifyMessage(text, type = '') {
  showMessage(verifyMessage, text, type);
}

function showTransactionMessage(text, type = '') {
  showMessage(transactionMessage, text, type);
}

function showInvestmentMessage(text, type = '') {
  showMessage(investmentMessage, text, type);
}

function showReportMessage(text, type = '') {
  showMessage(reportMessage, text, type);
}

function showTaxMessage(text, type = '') {
  showMessage(taxMessage, text, type);
}

function showScreen(screen) {
  [splash, authScreen, verifyScreen, homeScreen].forEach((item) => item.classList.add('hidden'));
  screen.classList.remove('hidden');
  toggleAuthParticles(screen === authScreen);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return '--';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
}

function openAuth() {
  if (splashTimerId) {
    window.clearTimeout(splashTimerId);
    splashTimerId = null;
  }
  if (splashProgressAnimationId) {
    window.cancelAnimationFrame(splashProgressAnimationId);
    splashProgressAnimationId = null;
  }
  if (splashProgressBar) {
    splashProgressBar.style.width = '100%';
  }
  showScreen(authScreen);
}

function updateSplashProgress() {
  const elapsed = Date.now() - splashStartTime;
  const progress = Math.min(elapsed / SPLASH_DURATION_MS, 1);
  splashProgressBar.style.width = `${progress * 100}%`;

  if (progress >= 1) {
    splashProgressAnimationId = null;
    return;
  }

  splashProgressAnimationId = window.requestAnimationFrame(updateSplashProgress);
}

function startSplashTimer() {
  splashStartTime = Date.now();
  splashProgressBar.style.width = '0%';
  if (splashProgressAnimationId) {
    window.cancelAnimationFrame(splashProgressAnimationId);
  }
  splashProgressAnimationId = window.requestAnimationFrame(updateSplashProgress);
  splashTimerId = window.setTimeout(() => {
    splashTimerId = null;
    openAuth();
  }, SPLASH_DURATION_MS);
}

function createAuthParticlesState() {
  const ctx = authParticlesCanvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCompactScreen = window.innerWidth < 768;
  const particleCount = prefersReducedMotion ? 16 : isCompactScreen ? 24 : 42;

  return {
    ctx,
    particles: Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 2.2 + 1,
      speedX: (Math.random() - 0.5) * (prefersReducedMotion ? 0.00008 : 0.00018),
      speedY: (Math.random() - 0.5) * (prefersReducedMotion ? 0.00008 : 0.00018),
      opacity: Math.random() * 0.35 + 0.08,
    })),
    pointer: { x: 0.5, y: 0.5, active: false },
    prefersReducedMotion,
  };
}

function resizeAuthParticlesCanvas() {
  if (!authParticlesCanvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  authParticlesCanvas.width = Math.floor(authScreen.clientWidth * ratio);
  authParticlesCanvas.height = Math.floor(authScreen.clientHeight * ratio);
  authParticlesCanvas.style.width = `${authScreen.clientWidth}px`;
  authParticlesCanvas.style.height = `${authScreen.clientHeight}px`;
  if (authParticlesState?.ctx) {
    authParticlesState.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}

function drawAuthParticles() {
  if (!authParticlesState || authScreen.classList.contains('hidden')) return;
  const { ctx, particles, pointer, prefersReducedMotion } = authParticlesState;
  const width = authScreen.clientWidth;
  const height = authScreen.clientHeight;

  ctx.clearRect(0, 0, width, height);

  particles.forEach((particle) => {
    const pointerOffsetX = prefersReducedMotion || !pointer.active ? 0 : (pointer.x - 0.5) * 0.3;
    const pointerOffsetY = prefersReducedMotion || !pointer.active ? 0 : (pointer.y - 0.5) * 0.3;

    particle.x += particle.speedX + pointerOffsetX * 0.0008;
    particle.y += particle.speedY + pointerOffsetY * 0.0008;

    if (particle.x < -0.05) particle.x = 1.05;
    if (particle.x > 1.05) particle.x = -0.05;
    if (particle.y < -0.05) particle.y = 1.05;
    if (particle.y > 1.05) particle.y = -0.05;

    const x = particle.x * width;
    const y = particle.y * height;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, particle.radius * 7);
    glow.addColorStop(0, `rgba(148, 163, 184, ${particle.opacity})`);
    glow.addColorStop(0.55, `rgba(56, 189, 248, ${particle.opacity * 0.42})`);
    glow.addColorStop(1, 'rgba(9, 20, 38, 0)');

    ctx.beginPath();
    ctx.fillStyle = glow;
    ctx.arc(x, y, particle.radius * 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(226, 232, 240, ${particle.opacity * 0.9})`;
    ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  authParticlesAnimationId = window.requestAnimationFrame(drawAuthParticles);
}

function startAuthParticles() {
  if (!authParticlesCanvas || authParticlesAnimationId !== null) return;
  authParticlesState = createAuthParticlesState();
  resizeAuthParticlesCanvas();
  drawAuthParticles();
}

function stopAuthParticles() {
  if (authParticlesAnimationId !== null) {
    window.cancelAnimationFrame(authParticlesAnimationId);
    authParticlesAnimationId = null;
  }
}

function toggleAuthParticles(shouldRun) {
  if (shouldRun) {
    startAuthParticles();
    return;
  }
  stopAuthParticles();
}

function hideAuthForms() {
  registerForm.classList.remove('active');
  registerForm.classList.add('hidden');
  loginForm.classList.remove('active');
  loginForm.classList.add('hidden');
}

function showRegister() {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  hideAuthForms();
  registerForm.classList.remove('hidden');
  registerForm.classList.add('active');
  showAuthMessage('');
}

function showLogin() {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  hideAuthForms();
  loginForm.classList.remove('hidden');
  loginForm.classList.add('active');
  showAuthMessage('');
}

function clearOtpInputs() {
  otpDigits.forEach((input) => {
    input.value = '';
  });
}

function getOtpCode() {
  return otpDigits.map((input) => input.value).join('');
}

function showVerifyEmail(email) {
  pendingVerificationEmail = email;
  verifyEmailInput.value = email;
  clearOtpInputs();
  showVerifyMessage('Digite o codigo de 6 digitos para confirmar o cadastro.', 'success');
  showScreen(verifyScreen);
  otpDigits[0].focus();
}

function setActiveSection(sectionId) {
  appSections.forEach((section) => {
    section.classList.toggle('hidden', section.id !== sectionId);
  });

  navButtons.forEach((button) => {
    const active = button.dataset.section === sectionId;
    button.classList.toggle('active', active);
    if (active) sectionTitle.textContent = button.textContent;
  });
}

function hideTaxWarningModal() {
  taxWarningModal.classList.add('hidden');
}

function showTaxWarningModal() {
  taxWarningModal.classList.remove('hidden');
}

function hideTaxTipsModal() {
  taxTipsModal.classList.add('hidden');
}

function showTaxTipsModal() {
  taxTipsModal.classList.remove('hidden');
}

function getTaxWarningHiddenPreference() {
  return window.localStorage.getItem(TAX_WARNING_STORAGE_KEY) === 'true';
}

function saveTaxWarningPreference() {
  if (hideTaxWarningCheckbox.checked) {
    window.localStorage.setItem(TAX_WARNING_STORAGE_KEY, 'true');
    return;
  }
  window.localStorage.removeItem(TAX_WARNING_STORAGE_KEY);
}

function openTaxesSection() {
  setActiveSection('taxes-section');
}

function openSectionWithGuard(sectionId) {
  if (sectionId !== 'taxes-section') {
    pendingSectionAfterWarning = null;
    hideTaxWarningModal();
    setActiveSection(sectionId);
    return;
  }

  if (getTaxWarningHiddenPreference()) {
    pendingSectionAfterWarning = null;
    hideTaxWarningModal();
    openTaxesSection();
    return;
  }

  pendingSectionAfterWarning = sectionId;
  showTaxWarningModal();
}

function showHome(email) {
  currentUserEmail = email;
  homeUserEmail.textContent = `Conta conectada: ${email}`;
  showScreen(homeScreen);
  setActiveSection('dashboard-section');
  resetTransactionForm();
  resetInvestmentForm();
  filtersForm.reset();
  reportMonthInput.value = selectedReportMonth;
  loadAllData();
}

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function renderChart(key, canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  destroyChart(key);
  chartInstances[key] = new Chart(canvas, config);
}

function renderList(container, items, emptyText, renderer) {
  container.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${emptyText}</span><strong>--</strong>`;
    container.appendChild(li);
    return;
  }
  items.forEach((item) => container.appendChild(renderer(item)));
}

function setTransactionEditMode(item = null) {
  editingTransactionId = item ? item.id : null;
  transactionSubmitButton.textContent = item ? 'Salvar alteracoes' : 'Salvar movimentacao';
  cancelTransactionEditButton.classList.toggle('hidden', !item);
}

function setInvestmentEditMode(item = null) {
  editingInvestmentId = item ? item.id : null;
  investmentSubmitButton.textContent = item ? 'Salvar alteracoes' : 'Salvar simulacao';
  cancelInvestmentEditButton.classList.toggle('hidden', !item);
}

function resetTransactionForm() {
  transactionForm.reset();
  document.getElementById('transaction-date').value = new Date().toISOString().slice(0, 10);
  customCategoryRow.classList.add('hidden');
  customCategoryInput.value = '';
  setTransactionEditMode();
}

function resetInvestmentForm() {
  investmentForm.reset();
  selectedRiskProfile = 'low';
  selectedInvestmentYears = 3;
  syncInvestmentChoices();
  updateInvestmentPreview();
  setInvestmentEditMode();
}

function calculateInvestmentProjection(monthlyAmount, annualRate, years) {
  const parsedAmount = Number(monthlyAmount) > 0 ? Number(monthlyAmount) : 0;
  const parsedYears = Number(years) > 0 ? Number(years) : 1;
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const totalMonths = parsedYears * 12;
  let total = 0;

  for (let month = 1; month <= totalMonths; month += 1) {
    total = (total + parsedAmount) * (1 + monthlyRate);
  }

  const invested = Number((parsedAmount * totalMonths).toFixed(2));
  return {
    invested,
    projectedValue: Number(total.toFixed(2)),
    gain: Number((total - invested).toFixed(2)),
  };
}

function syncInvestmentChoices() {
  riskProfileButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.riskProfile === selectedRiskProfile);
  });
  investmentYearsButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.investmentYears) === selectedInvestmentYears);
  });
  riskProfileHelp.textContent = RISK_PROFILES[selectedRiskProfile].help;
}

function updateInvestmentPreview() {
  const monthlyAmount = Number(investmentAmountInput.value || 0);
  const profile = RISK_PROFILES[selectedRiskProfile];
  const projection = calculateInvestmentProjection(monthlyAmount, profile.annualRate, selectedInvestmentYears);

  investmentHeadline.textContent = `Seu dinheiro pode crescer para ${formatCurrency(projection.projectedValue)} em ${selectedInvestmentYears} ano${selectedInvestmentYears > 1 ? 's' : ''}.`;
  investmentSubheadline.textContent = monthlyAmount > 0
    ? `Investindo ${formatCurrency(monthlyAmount)} por mes, voce pode juntar ${formatCurrency(projection.invested)} e buscar um crescimento estimado de ${formatCurrency(projection.gain)}. Para esse perfil, exemplos comuns seriam ${profile.examples}.`
    : `Investindo pouco por mes voce ja comeca a construir resultado. Para esse perfil, exemplos comuns seriam ${profile.examples}.`;
}

function readMoneyInput(id) {
  return Number(document.getElementById(id).value || 0);
}

function calculateTaxes() {
  const monthlyIncome = readMoneyInput('tax-income-monthly');
  const otherIncome = readMoneyInput('tax-other-income');
  const dependents = Math.max(0, Number(document.getElementById('tax-dependents').value || 0));
  const healthExpenses = readMoneyInput('tax-health');
  const educationExpenses = readMoneyInput('tax-education');
  const annualIncome = monthlyIncome * 12 + otherIncome;
  const deductions = dependents * DEPENDENT_DEDUCTION + healthExpenses + educationExpenses;
  const baseIncome = Math.max(0, annualIncome - deductions);

  let rate = 0;
  let bracketLabel = 'Isento';

  if (baseIncome <= 22847) {
    rate = 0;
    bracketLabel = 'Isento';
  } else if (baseIncome <= 33919) {
    rate = 7.5;
    bracketLabel = 'Ate R$ 33.919';
  } else if (baseIncome <= 45012) {
    rate = 15;
    bracketLabel = 'Ate R$ 45.012';
  } else {
    rate = 27.5;
    bracketLabel = 'Acima de R$ 45.012';
  }

  const estimatedTax = Number((baseIncome * (rate / 100)).toFixed(2));
  const netIncome = Number((annualIncome - estimatedTax).toFixed(2));
  const taxPercentOfIncome = annualIncome > 0 ? Number(((estimatedTax / annualIncome) * 100).toFixed(1)) : 0;
  const netPercentOfIncome = annualIncome > 0 ? Number(((netIncome / annualIncome) * 100).toFixed(1)) : 0;

  return {
    annualIncome: Number(annualIncome.toFixed(2)),
    baseIncome: Number(baseIncome.toFixed(2)),
    deductions: Number(deductions.toFixed(2)),
    rate,
    bracketLabel,
    estimatedTax,
    netIncome,
    taxPercentOfIncome,
    netPercentOfIncome,
  };
}

function buildTaxSuggestions(result, input) {
  const suggestions = [];

  if (input.healthExpenses <= 0) {
    suggestions.push('Voce pode reduzir seu imposto declarando despesas medicas, se tiver comprovantes.');
  }

  if (input.dependents <= 0) {
    suggestions.push('Adicionar dependentes pode diminuir o imposto quando isso fizer sentido na sua declaracao.');
  }

  if (input.healthExpenses + input.educationExpenses < result.annualIncome * 0.05) {
    suggestions.push('Seus gastos dedutiveis estao baixos. Vale revisar saude e educacao para nao esquecer nada.');
  }

  if (result.rate >= 15) {
    suggestions.push('Voce esta pagando imposto elevado em relacao a sua renda. Organizar deducoes pode ajudar.');
  }

  if (!suggestions.length) {
    suggestions.push('Sua simulacao esta equilibrada. Continue organizando comprovantes para declarar tudo corretamente.');
  }

  return suggestions.slice(0, 4);
}

function renderTaxSimulation(result) {
  const input = {
    dependents: Math.max(0, Number(document.getElementById('tax-dependents').value || 0)),
    healthExpenses: readMoneyInput('tax-health'),
    educationExpenses: readMoneyInput('tax-education'),
  };
  const suggestions = buildTaxSuggestions(result, input);

  taxResultsPanel.classList.remove('hidden');
  taxInsightsPanel.classList.remove('hidden');
  taxAnnualIncome.textContent = formatCurrency(result.annualIncome);
  taxBaseIncome.textContent = formatCurrency(result.baseIncome);
  taxBracket.textContent = result.bracketLabel;
  taxEstimated.textContent = formatCurrency(result.estimatedTax);
  taxNetIncome.textContent = formatCurrency(result.netIncome);
  taxHighlightValue.textContent = formatCurrency(result.estimatedTax);

  if (result.rate === 0) {
    taxFeedbackPrimary.textContent = 'Voce esta isento de imposto.';
    taxFeedbackSecondary.textContent = 'Pela estimativa simplificada, hoje voce nao teria imposto a pagar.';
  } else if (result.rate >= 27.5) {
    taxFeedbackPrimary.textContent = 'Voce esta na faixa mais alta de imposto (27,5%).';
    taxFeedbackSecondary.textContent = 'Voce ja paga um valor consideravel de imposto.';
  } else if (result.rate >= 15) {
    taxFeedbackPrimary.textContent = 'Voce esta em uma faixa intermediaria de imposto.';
    taxFeedbackSecondary.textContent = 'Sua aliquota ja merece atencao para nao perder deducoes importantes.';
  } else {
    taxFeedbackPrimary.textContent = `Sua aliquota e ${result.rate.toFixed(1)}%.`;
    taxFeedbackSecondary.textContent = 'Voce esta em uma faixa menor, mas ainda pode melhorar sua declaracao com deducoes.';
  }

  taxSuggestions.innerHTML = '';
  suggestions.forEach((suggestion) => {
    const li = document.createElement('li');
    li.textContent = suggestion;
    taxSuggestions.appendChild(li);
  });
  taxSuggestions.classList.remove('hidden');

  renderChart('taxSummary', 'tax-chart', {
    type: 'bar',
    data: {
      labels: [
        'Renda total (100%)',
        `Imposto (${result.taxPercentOfIncome}%)`,
        `Valor liquido (${result.netPercentOfIncome}%)`,
      ],
      datasets: [
        {
          label: 'Estimativa',
          data: [result.annualIncome, result.estimatedTax, result.netIncome],
          backgroundColor: ['#38bdf8', '#ef4444', '#22c55e'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

function resetTaxSimulation() {
  taxForm.reset();
  document.getElementById('tax-dependents').value = 0;
  taxResultsPanel.classList.add('hidden');
  taxInsightsPanel.classList.add('hidden');
  taxAnnualIncome.textContent = formatCurrency(0);
  taxBaseIncome.textContent = formatCurrency(0);
  taxBracket.textContent = 'Isento';
  taxEstimated.textContent = formatCurrency(0);
  taxNetIncome.textContent = formatCurrency(0);
  taxHighlightValue.textContent = formatCurrency(0);
  taxFeedbackPrimary.textContent = 'Voce esta isento.';
  taxFeedbackSecondary.textContent = 'Preencha os campos para ver sua estimativa.';
  taxSuggestions.innerHTML = '';
  taxSuggestions.classList.add('hidden');
  showTaxMessage('');
  renderChart('taxSummary', 'tax-chart', {
    type: 'bar',
    data: {
      labels: ['Renda total (100%)', 'Imposto (0%)', 'Valor liquido (0%)'],
      datasets: [
        {
          label: 'Estimativa',
          data: [0, 0, 0],
          backgroundColor: ['#38bdf8', '#ef4444', '#22c55e'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

function buildItemActions(onEdit, onDelete) {
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'secondary';
  editButton.textContent = 'Editar';
  editButton.addEventListener('click', onEdit);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button';
  deleteButton.textContent = 'Excluir';
  deleteButton.addEventListener('click', onDelete);

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  return actions;
}

function getInvestmentDetailAction(onView) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = 'Ver detalhes';
  button.addEventListener('click', onView);
  return button;
}

function buildTransactionItem(item) {
  const li = document.createElement('li');
  const sign = item.type === 'income' ? '+' : '-';
  const cls = item.type === 'income' ? 'pos' : 'neg';
  const note = item.notes ? `<small>${item.notes}</small>` : '';
  li.innerHTML = `
    <div>
      <strong>${item.category}</strong>
      <span>${formatDate(item.date)} • ${item.type === 'income' ? 'Entrada' : 'Saida'}</span>
      ${note}
    </div>
    <div>
      <strong class="${cls}">${sign} ${formatCurrency(item.amount)}</strong>
    </div>
  `;
  li.lastElementChild.appendChild(
    buildItemActions(
      () => startTransactionEdit(item),
      () => deleteTransaction(item.id)
    )
  );
  return li;
}

function buildInvestmentItem(item) {
  const li = document.createElement('li');
  const resultValue = (item.amount * item.profitability) / 100;
  const cls = resultValue >= 0 ? 'pos' : 'neg';
  li.innerHTML = `
    <div>
      <strong>${item.type}</strong>
      <span>${formatDate(item.date)} • Rentabilidade ${item.profitability.toFixed(2)}%</span>
    </div>
    <div>
      <strong class="${cls}">${formatCurrency(item.amount + resultValue)}</strong>
    </div>
  `;
  li.lastElementChild.appendChild(
    buildItemActions(
      () => startInvestmentEdit(item),
      () => deleteInvestment(item.id)
    )
  );
  return li;
}

function buildInvestmentSimulationItem(item) {
  const li = document.createElement('li');
  li.classList.toggle('is-selected', item.id === selectedInvestmentViewId);
  li.innerHTML = `
    <div>
      <strong>${item.riskLabel}</strong>
      <span>${formatCurrency(item.monthlyAmount)} por mes â€¢ ${item.years} ano${item.years > 1 ? 's' : ''}</span>
      <small>Estimativa simples de ${item.annualRate}% ao ano</small>
    </div>
    <div>
      <strong class="pos">${formatCurrency(item.projectedValue)}</strong>
      <small>Pode virar ${formatCurrency(item.projectedValue)}</small>
    </div>
  `;
  li.lastElementChild.appendChild(getInvestmentDetailAction(() => {
    selectedInvestmentViewId = item.id;
    renderInvestments(lastInvestmentsPayload);
  }));
  li.lastElementChild.appendChild(
    buildItemActions(
      () => startInvestmentEdit(item),
      () => deleteInvestment(item.id)
    )
  );
  return li;
}

function startTransactionEdit(item) {
  document.getElementById('transaction-type').value = item.type;
  document.getElementById('transaction-amount').value = item.amount;
  document.getElementById('transaction-date').value = item.date;

  if (categoriesCache.includes(item.category)) {
    transactionCategory.value = item.category;
    customCategoryRow.classList.add('hidden');
    customCategoryInput.value = '';
  } else {
    transactionCategory.value = '__custom__';
    customCategoryRow.classList.remove('hidden');
    customCategoryInput.value = item.category;
  }

  document.getElementById('transaction-notes').value = item.notes || '';
  setTransactionEditMode(item);
  transactionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startInvestmentEdit(item) {
  investmentAmountInput.value = item.monthlyAmount;
  selectedInvestmentViewId = item.id;
  selectedRiskProfile = item.riskProfile;
  selectedInvestmentYears = item.years;
  syncInvestmentChoices();
  updateInvestmentPreview();
  setInvestmentEditMode(item);
  investmentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteTransaction(id) {
  if (!window.confirm('Deseja excluir esta movimentacao?')) return;
  try {
    const data = await apiFetch(`/api/transactions/${id}?email=${encodeURIComponent(currentUserEmail)}`, {
      method: 'DELETE',
    });
    if (editingTransactionId === id) resetTransactionForm();
    showTransactionMessage(data.message, 'success');
    await loadAllData();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
}

async function deleteInvestment(id) {
  if (!window.confirm('Deseja excluir esta simulacao?')) return;
  try {
    const data = await apiFetch(`/api/investments/${id}?email=${encodeURIComponent(currentUserEmail)}`, {
      method: 'DELETE',
    });
    if (editingInvestmentId === id) resetInvestmentForm();
    if (selectedInvestmentViewId === id) selectedInvestmentViewId = null;
    showInvestmentMessage(data.message, 'success');
    await loadAllData();
  } catch (error) {
    showInvestmentMessage(error.message, 'error');
  }
}

function renderCategoryOptions(categories) {
  const options = categories.map((category) => `<option value="${category}">${category}</option>`).join('');
  transactionCategory.innerHTML = `${options}<option value="__custom__">Personalizada</option>`;
  filterCategory.innerHTML = `<option value="all">Todas</option>${options}`;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Erro inesperado.');
  }
  return data;
}

async function loadCategories() {
  const data = await apiFetch(`/api/categories?email=${encodeURIComponent(currentUserEmail)}`);
  categoriesCache = data.categories;
  renderCategoryOptions(categoriesCache);
}

function buildCategoryChartData(items) {
  const labels = items.map((item) => item.category);
  const values = items.map((item) => item.total);
  const colors = ['#0ea5e9', '#f97316', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];
  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, index) => colors[index % colors.length]),
        borderWidth: 0,
      },
    ],
  };
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#dbe7ff' } } },
  };
}

function renderDashboard(data) {
  incomeTotal.textContent = formatCurrency(data.summary.income);
  expenseTotal.textContent = formatCurrency(data.summary.expense);
  balanceTotal.textContent = formatCurrency(data.summary.balance);
  renderList(latestTransactionList, data.latestTransactions, 'Nenhuma movimentacao cadastrada ainda.', buildTransactionItem);

  renderChart('dashboardCategory', 'category-chart', {
    type: 'doughnut',
    data: buildCategoryChartData(data.categoryBreakdown.length ? data.categoryBreakdown : [{ category: 'Sem despesas', total: 1 }]),
    options: chartBaseOptions(),
  });

  renderChart('dashboardMonthly', 'monthly-chart', {
    type: 'bar',
    data: {
      labels: data.monthlySeries.map((item) => item.label),
      datasets: [
        { label: 'Entradas', data: data.monthlySeries.map((item) => item.income), backgroundColor: '#22c55e' },
        { label: 'Saidas', data: data.monthlySeries.map((item) => item.expense), backgroundColor: '#ef4444' },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

async function loadDashboard() {
  renderDashboard(await apiFetch(`/api/dashboard?email=${encodeURIComponent(currentUserEmail)}`));
}

function readTransactionFilters() {
  return new URLSearchParams({
    email: currentUserEmail,
    type: filterType.value || 'all',
    category: filterCategory.value || 'all',
    period: filterPeriod.value || 'all',
    startDate: filterStartDate.value || '',
    endDate: filterEndDate.value || '',
  });
}

function renderFilteredTransactions(data) {
  filteredIncome.textContent = formatCurrency(data.summary.income);
  filteredExpense.textContent = formatCurrency(data.summary.expense);
  filteredBalance.textContent = formatCurrency(data.summary.balance);
  filteredCount.textContent = String(data.totalCount);
  renderList(transactionList, data.transactions, 'Nenhuma movimentacao para os filtros escolhidos.', buildTransactionItem);

  renderChart('filteredCategory', 'filtered-category-chart', {
    type: 'pie',
    data: buildCategoryChartData(data.categoryBreakdown.length ? data.categoryBreakdown : [{ category: 'Sem despesas', total: 1 }]),
    options: chartBaseOptions(),
  });
}

async function loadTransactions() {
  const data = await apiFetch(`/api/transactions?${readTransactionFilters().toString()}`);
  renderFilteredTransactions(data);
}

let lastInvestmentsPayload = null;

function renderInvestments(data) {
  lastInvestmentsPayload = data;
  investedTotal.textContent = formatCurrency(data.summary.totalInvested);
  profitLossTotal.textContent = formatCurrency(data.summary.profitLoss);
  currentValueTotal.textContent = formatCurrency(data.summary.currentValue);

  if (!data.investments.length) {
    selectedInvestmentViewId = null;
    investmentDetailPanel.classList.add('hidden');
  } else if (!data.investments.some((item) => item.id === selectedInvestmentViewId)) {
    selectedInvestmentViewId = data.investments[0].id;
  }

  renderList(investmentList, data.investments, 'Nenhuma simulacao salva ainda.', buildInvestmentSimulationItem);

  const selectedInvestment = data.investments.find((item) => item.id === selectedInvestmentViewId) || data.investments[0];

  if (selectedInvestment) {
    investmentDetailPanel.classList.remove('hidden');
    selectedInvestmentProfile.textContent = selectedInvestment.riskLabel;
    selectedInvestmentAmount.textContent = formatCurrency(selectedInvestment.monthlyAmount);
    selectedInvestmentYearsText.textContent = `${selectedInvestment.years} ano${selectedInvestment.years > 1 ? 's' : ''}`;
    selectedInvestmentProjected.textContent = formatCurrency(selectedInvestment.projectedValue);
  }

  renderChart('investments', 'investment-chart', {
    type: 'line',
    data: {
      labels: selectedInvestment ? selectedInvestment.yearlyPoints.map((item) => `${item.year} ano${item.year > 1 ? 's' : ''}`) : data.evolution.map((item) => item.label),
      datasets: [
        {
          label: 'Seu dinheiro pode crescer',
          data: selectedInvestment ? selectedInvestment.yearlyPoints.map((item) => item.value) : data.evolution.map((item) => item.currentValue),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.18)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

async function loadInvestments() {
  renderInvestments(await apiFetch(`/api/investments?email=${encodeURIComponent(currentUserEmail)}`));
}

function renderReports(data) {
  const report = data.selectedReport;
  selectedReportMonth = report.month;
  reportMonthInput.value = report.month;
  reportTitle.textContent = `Relatorio de ${report.label}`;
  reportIncome.textContent = formatCurrency(report.summary.income);
  reportExpense.textContent = formatCurrency(report.summary.expense);
  reportBalance.textContent = formatCurrency(report.summary.balance);
  reportTransactionsCount.textContent = String(report.transactionsCount);

  reportsHistory.innerHTML = '';
  data.reports.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `history-button${item.month === report.month ? ' active' : ''}`;
    button.textContent = item.label;
    button.addEventListener('click', () => loadReports(item.month));
    reportsHistory.appendChild(button);
  });

  reportTopCategories.innerHTML = '';
  const topCategories = report.topCategories.length ? report.topCategories : [{ category: 'Sem dados', total: 0, percentage: 0 }];
  topCategories.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.category}: ${formatCurrency(item.total)} (${item.percentage}%)`;
    reportTopCategories.appendChild(li);
  });

  reportInsights.innerHTML = '';
  report.insights.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    reportInsights.appendChild(li);
  });

  renderChart('reportCategory', 'report-category-chart', {
    type: 'pie',
    data: buildCategoryChartData(report.categoryBreakdown.length ? report.categoryBreakdown : [{ category: 'Sem despesas', total: 1 }]),
    options: chartBaseOptions(),
  });
}

async function loadReports(month = selectedReportMonth) {
  renderReports(await apiFetch(`/api/reports?email=${encodeURIComponent(currentUserEmail)}&month=${encodeURIComponent(month)}`));
}

async function loadAllData() {
  if (!currentUserEmail) return;
  try {
    await loadCategories();
    await Promise.all([loadDashboard(), loadTransactions(), loadInvestments(), loadReports(selectedReportMonth)]);
    showTransactionMessage('');
    showInvestmentMessage('');
    showReportMessage('');
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
}

function setupOtpInputs() {
  otpDigits.forEach((input, index) => {
    input.addEventListener('input', (event) => {
      const numeric = event.target.value.replace(/\D/g, '');
      event.target.value = numeric.slice(-1);
      if (event.target.value && index < otpDigits.length - 1) {
        otpDigits[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) otpDigits[index - 1].focus();
    });

    input.addEventListener('paste', (event) => {
      event.preventDefault();
      const pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((digit, digitIndex) => {
        if (otpDigits[digitIndex]) otpDigits[digitIndex].value = digit;
      });
      otpDigits[Math.min(pasted.length, otpDigits.length - 1)].focus();
    });
  });
}

startSplashTimer();
enterAppButton.addEventListener('click', openAuth);
tabRegister.addEventListener('click', showRegister);
tabLogin.addEventListener('click', showLogin);
backToLoginButton.addEventListener('click', () => {
  showScreen(authScreen);
  showLogin();
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => openSectionWithGuard(button.dataset.section));
});

refreshDataButton.addEventListener('click', loadAllData);

transactionCategory.addEventListener('change', () => {
  const isCustom = transactionCategory.value === '__custom__';
  customCategoryRow.classList.toggle('hidden', !isCustom);
  if (!isCustom) customCategoryInput.value = '';
});

addCategoryButton.addEventListener('click', async () => {
  const name = newCategoryName.value.trim();
  if (!name) {
    showTransactionMessage('Digite o nome da nova categoria.', 'error');
    return;
  }

  try {
    const data = await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUserEmail, name }),
    });
    categoriesCache = data.categories;
    renderCategoryOptions(categoriesCache);
    transactionCategory.value = name;
    newCategoryName.value = '';
    showTransactionMessage('Categoria adicionada com sucesso.', 'success');
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  try {
    const data = await apiFetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: document.getElementById('register-password').value,
      }),
    });
    registerForm.reset();
    showVerifyEmail(email);
    if (data.devOtp) {
      showVerifyMessage(`OTP de cadastro para desenvolvimento: ${data.devOtp}`, 'success');
    }
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
});

verifyEmailForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = verifyEmailInput.value.trim();
  const otp = getOtpCode();
  if (otp.length !== 6) {
    showVerifyMessage('Digite os 6 digitos do codigo.', 'error');
    return;
  }

  try {
    await apiFetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    pendingVerificationEmail = '';
    showScreen(authScreen);
    showLogin();
    document.getElementById('login-email').value = email;
    showAuthMessage('Cadastro confirmado. Agora voce pode fazer login.', 'success');
  } catch (error) {
    showVerifyMessage(error.message, 'error');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  try {
    await apiFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: document.getElementById('login-password').value,
      }),
    });
    loginForm.reset();
    showHome(email);
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
});

logoutButton.addEventListener('click', () => {
  currentUserEmail = '';
  pendingVerificationEmail = '';
  categoriesCache = [];
  showScreen(authScreen);
  showLogin();
});

transactionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const category = transactionCategory.value === '__custom__' ? customCategoryInput.value.trim() : transactionCategory.value;
  try {
    const data = await apiFetch(editingTransactionId ? `/api/transactions/${editingTransactionId}` : '/api/transactions', {
      method: editingTransactionId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUserEmail,
        type: document.getElementById('transaction-type').value,
        amount: Number(document.getElementById('transaction-amount').value),
        date: document.getElementById('transaction-date').value,
        category,
        notes: document.getElementById('transaction-notes').value.trim(),
      }),
    });
    resetTransactionForm();
    showTransactionMessage(data.message, 'success');
    await loadAllData();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

filtersForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await loadTransactions();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

clearFiltersButton.addEventListener('click', async () => {
  filtersForm.reset();
  try {
    await loadTransactions();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

investmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await apiFetch(editingInvestmentId ? `/api/investments/${editingInvestmentId}` : '/api/investments', {
      method: editingInvestmentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUserEmail,
        monthlyAmount: Number(investmentAmountInput.value),
        riskProfile: selectedRiskProfile,
        years: selectedInvestmentYears,
      }),
    });
    resetInvestmentForm();
    showInvestmentMessage(data.message, 'success');
    await loadAllData();
  } catch (error) {
    showInvestmentMessage(error.message, 'error');
  }
});

cancelTransactionEditButton.addEventListener('click', () => {
  resetTransactionForm();
  showTransactionMessage('Edicao cancelada.', 'success');
});

cancelInvestmentEditButton.addEventListener('click', () => {
  resetInvestmentForm();
  showInvestmentMessage('Edicao cancelada.', 'success');
});

taxForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const result = calculateTaxes();
  renderTaxSimulation(result);
  showTaxMessage('Estimativa atualizada com sucesso.', 'success');
});

clearTaxFormButton.addEventListener('click', () => {
  resetTaxSimulation();
});

openTaxTipsButton.addEventListener('click', () => {
  showTaxTipsModal();
});

closeTaxTipsButton.addEventListener('click', () => {
  hideTaxTipsModal();
});

continueTaxWarningButton.addEventListener('click', () => {
  saveTaxWarningPreference();
  hideTaxWarningModal();
  if (pendingSectionAfterWarning === 'taxes-section') {
    openTaxesSection();
  }
  pendingSectionAfterWarning = null;
});

backTaxWarningButton.addEventListener('click', () => {
  saveTaxWarningPreference();
  pendingSectionAfterWarning = null;
  hideTaxWarningModal();
  setActiveSection('dashboard-section');
});

riskProfileButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedRiskProfile = button.dataset.riskProfile;
    syncInvestmentChoices();
    updateInvestmentPreview();
  });
});

investmentYearsButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedInvestmentYears = Number(button.dataset.investmentYears);
    syncInvestmentChoices();
    updateInvestmentPreview();
  });
});

investmentAmountInput.addEventListener('input', updateInvestmentPreview);

window.addEventListener('resize', () => {
  if (!authScreen.classList.contains('hidden')) {
    authParticlesState = createAuthParticlesState();
    resizeAuthParticlesCanvas();
  }
});

authScreen.addEventListener('pointermove', (event) => {
  if (!authParticlesState) return;
  const rect = authScreen.getBoundingClientRect();
  authParticlesState.pointer.x = (event.clientX - rect.left) / rect.width;
  authParticlesState.pointer.y = (event.clientY - rect.top) / rect.height;
  authParticlesState.pointer.active = true;
});

authScreen.addEventListener('pointerleave', () => {
  if (!authParticlesState) return;
  authParticlesState.pointer.active = false;
});

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await apiFetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUserEmail, month: reportMonthInput.value }),
    });
    showReportMessage(data.message, 'success');
    selectedReportMonth = reportMonthInput.value;
    await loadReports(selectedReportMonth);
  } catch (error) {
    showReportMessage(error.message, 'error');
  }
});

exportReportButton.addEventListener('click', () => {
  if (!currentUserEmail) return;
  window.open(
    `/api/reports/export?email=${encodeURIComponent(currentUserEmail)}&month=${encodeURIComponent(reportMonthInput.value)}`,
    '_blank',
    'noopener'
  );
});

resetTransactionForm();
resetInvestmentForm();
resetTaxSimulation();
hideTaxWarningCheckbox.checked = getTaxWarningHiddenPreference();
hideTaxTipsModal();
reportMonthInput.value = selectedReportMonth;

setupOtpInputs();
showRegister();
