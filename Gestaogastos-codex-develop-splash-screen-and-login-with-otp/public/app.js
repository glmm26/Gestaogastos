const splash = document.getElementById('splash');
const authScreen = document.getElementById('auth-screen');
const enterAppButton = document.getElementById('enter-app');

const tabRegister = document.getElementById('tab-register');
const tabLogin = document.getElementById('tab-login');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const otpForm = document.getElementById('otp-form');
const messageElement = document.getElementById('message');

let currentLoginEmail = '';

function showMessage(text, type = 'success') {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
}

function openAuth() {
  splash.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

setTimeout(openAuth, 2500);
enterAppButton.addEventListener('click', openAuth);

function showRegister() {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.add('active');
  loginForm.classList.remove('active');
  otpForm.classList.add('hidden');
  showMessage('');
}

function showLogin() {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.add('active');
  registerForm.classList.remove('active');
  otpForm.classList.add('hidden');
  showMessage('');
}

tabRegister.addEventListener('click', showRegister);
tabLogin.addEventListener('click', showLogin);

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Não foi possível cadastrar.');
    }

    showMessage(data.message, 'success');
    registerForm.reset();
    showLogin();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Não foi possível iniciar login.');
    }

    currentLoginEmail = email;
    otpForm.classList.remove('hidden');
    showMessage('OTP enviado para seu email. Digite o código para continuar.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

otpForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const otp = document.getElementById('otp-code').value;

  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentLoginEmail, otp }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Falha na validação do OTP.');
    }

    showMessage(`${data.message} Token: ${data.token}`, 'success');
    otpForm.reset();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});
