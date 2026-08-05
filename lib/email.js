const MINUTOS_EXPIRACAO_OTP = 5;
const PROVEDOR_EMAIL = String(process.env.EMAIL_PROVIDER || 'api').trim().toLowerCase();
const URL_API_EMAIL = String(process.env.EMAIL_API_URL || 'https://api.brevo.com/v3/smtp/email').trim();
const CHAVE_API_EMAIL = String(process.env.EMAIL_API_KEY || '').trim();
const EMAIL_REMETENTE_API = String(process.env.EMAIL_API_SENDER_EMAIL || '').trim();
const NOME_REMETENTE_API = String(process.env.EMAIL_API_SENDER_NAME || 'Gestão de Gastos').trim();

function isEmailApiConfigured() {
  return (
    PROVEDOR_EMAIL === 'api' &&
    URL_API_EMAIL &&
    CHAVE_API_EMAIL &&
    EMAIL_REMETENTE_API &&
    !CHAVE_API_EMAIL.includes('COLOQUE_SUA_CHAVE_BREVO_AQUI')
  );
}

async function sendOtpEmail(targetEmail, otp) {
  if (!isEmailApiConfigured()) {
    throw new Error('Serviço de email não configurado.');
  }

  const payload = {
    sender: {
      name: NOME_REMETENTE_API,
      email: EMAIL_REMETENTE_API,
    },
    to: [{ email: targetEmail }],
    subject: 'Código de confirmação de cadastro - Gestão de Gastos',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Código de confirmação</h2>
          <p>Use o código abaixo para concluir seu cadastro:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>Esse código expira em ${MINUTOS_EXPIRACAO_OTP} minutos.</p>
        </body>
      </html>
    `,
  };

  const response = await fetch(URL_API_EMAIL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': CHAVE_API_EMAIL,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao enviar OTP por email (${response.status}): ${details}`);
  }
}

module.exports = {
  MINUTOS_EXPIRACAO_OTP,
  isEmailApiConfigured,
  sendOtpEmail,
};
