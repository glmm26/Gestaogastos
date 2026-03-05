const splash = document.getElementById('splash');
const authScreen = document.getElementById('auth-screen');
const verifyScreen = document.getElementById('verify-screen');
const homeScreen = document.getElementById('home-screen');
const enterAppButton = document.getElementById('enter-app');

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

const homeUserEmail = document.getElementById('home-user-email');
const logoutButton = document.getElementById('logout-button');
const incomeTotal = document.getElementById('income-total');
const expenseTotal = document.getElementById('expense-total');
const balanceTotal = document.getElementById('balance-total');
const incomeCard = document.getElementById('income-card');
const expenseCard = document.getElementById('expense-card');
const transactionsTitle = document.getElementById('transactions-title');
const transactionList = document.getElementById('transaction-list');
const transactionForm = document.getElementById('transaction-form');
const transactionMessage = document.getElementById('transaction-message');

let pendingVerificationEmail = '';
let currentUserEmail = '';
let activeTransactionFilter = null;
let cachedTransactions = [];

function showAuthMessage(text, type = '') {
  authMessage.textContent = text;
  authMessage.className = type ? `message ${type}` : 'message';
}

function showVerifyMessage(text, type = '') {
  verifyMessage.textContent = text;
  verifyMessage.className = type ? `message ${type}` : 'message';
}

function showScreen(screen) {
  authScreen.classList.add('hidden');
  verifyScreen.classList.add('hidden');
  homeScreen.classList.add('hidden');
  splash.classList.add('hidden');
  screen.classList.remove('hidden');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function openAuth() {
  showScreen(authScreen);
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
  showVerifyMessage('Digite o codigo de 6 digitos para concluir a verificacao.', 'success');
  showScreen(verifyScreen);
  otpDigits[0].focus();
}

function showHome(email) {
  currentUserEmail = email;
  activeTransactionFilter = null;
  homeUserEmail.textContent = `Conta conectada: ${email}`;
  showScreen(homeScreen);
  loadTransactions();
}

function showTransactionMessage(text, type = '') {
  transactionMessage.textContent = text;
  transactionMessage.className = type ? `message ${type}` : 'message';
}

function updateFilterVisualState() {
  incomeCard.classList.toggle('active-filter', activeTransactionFilter === 'income');
  expenseCard.classList.toggle('active-filter', activeTransactionFilter === 'expense');

  if (activeTransactionFilter === 'income') {
    transactionsTitle.textContent = 'Movimentacoes: somente entradas';
    return;
  }
  if (activeTransactionFilter === 'expense') {
    transactionsTitle.textContent = 'Movimentacoes: somente saidas';
    return;
  }
  transactionsTitle.textContent = 'Ultimas movimentacoes';
}

function renderTransactions(items) {
  transactionList.innerHTML = '';

  if (!items.length) {
    const emptyItem = document.createElement('li');
    emptyItem.innerHTML = '<span>Nenhuma movimentacao cadastrada ainda.</span><strong>--</strong>';
    transactionList.appendChild(emptyItem);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    const sign = item.type === 'income' ? '+' : '-';
    const cls = item.type === 'income' ? 'pos' : 'neg';
    li.innerHTML = `<span>${item.description}</span><strong class="${cls}">${sign} ${formatCurrency(item.amount)}</strong>`;
    transactionList.appendChild(li);
  });
}

function renderFilteredTransactions() {
  const filtered = activeTransactionFilter
    ? cachedTransactions.filter((item) => item.type === activeTransactionFilter)
    : cachedTransactions;
  updateFilterVisualState();
  renderTransactions(filtered);
}

async function loadTransactions() {
  if (!currentUserEmail) return;

  try {
    const response = await fetch(`/api/transactions?email=${encodeURIComponent(currentUserEmail)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Falha ao carregar movimentacoes.');
    }

    incomeTotal.textContent = formatCurrency(data.summary.income);
    expenseTotal.textContent = formatCurrency(data.summary.expense);
    balanceTotal.textContent = formatCurrency(data.summary.balance);
    cachedTransactions = data.transactions;
    renderFilteredTransactions();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
}

function toggleTransactionFilter(filterType) {
  activeTransactionFilter = activeTransactionFilter === filterType ? null : filterType;
  renderFilteredTransactions();
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
      if (event.key === 'Backspace' && !input.value && index > 0) {
        otpDigits[index - 1].focus();
      }
    });

    input.addEventListener('paste', (event) => {
      event.preventDefault();
      const pasted = (event.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, 6);

      if (!pasted) return;

      pasted.split('').forEach((digit, digitIndex) => {
        if (otpDigits[digitIndex]) {
          otpDigits[digitIndex].value = digit;
        }
      });

      const nextIndex = Math.min(pasted.length, otpDigits.length - 1);
      otpDigits[nextIndex].focus();
    });
  });
}

setTimeout(openAuth, 2500);
enterAppButton.addEventListener('click', openAuth);

tabRegister.addEventListener('click', showRegister);
tabLogin.addEventListener('click', showLogin);

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Nao foi possivel concluir o cadastro.');
    }

    registerForm.reset();
    showVerifyEmail(email);
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
    const response = await fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Falha na verificacao de email.');
    }

    showLogin();
    document.getElementById('login-email').value = email;
    pendingVerificationEmail = '';
    showAuthMessage('Email verificado. Agora faca login.', 'success');
    showScreen(authScreen);
  } catch (error) {
    showVerifyMessage(error.message, 'error');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 403) {
        showVerifyEmail(email);
      }
      throw new Error(data.message || 'Falha no login.');
    }

    loginForm.reset();
    showHome(email);
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
});

backToLoginButton.addEventListener('click', () => {
  showScreen(authScreen);
  showLogin();
});

logoutButton.addEventListener('click', () => {
  currentUserEmail = '';
  activeTransactionFilter = null;
  cachedTransactions = [];
  showTransactionMessage('');
  showScreen(authScreen);
  showLogin();
});

transactionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUserEmail) {
    showTransactionMessage('Faca login novamente para adicionar movimentacoes.', 'error');
    return;
  }

  const type = document.getElementById('transaction-type').value;
  const amount = Number(document.getElementById('transaction-amount').value);
  const description = document.getElementById('transaction-description').value.trim();

  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUserEmail,
        type,
        amount,
        description,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Nao foi possivel adicionar movimentacao.');
    }

    transactionForm.reset();
    showTransactionMessage(data.message, 'success');
    await loadTransactions();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

setupOtpInputs();
incomeCard.addEventListener('click', () => toggleTransactionFilter('income'));
expenseCard.addEventListener('click', () => toggleTransactionFilter('expense'));
showRegister();
