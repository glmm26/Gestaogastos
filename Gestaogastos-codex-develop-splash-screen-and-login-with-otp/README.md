# Gestão de Gastos

Protótipo inicial com:
- Splash screen na tela principal.
- Tela de autenticação com cadastro simples (email e senha).
- Login em duas etapas com OTP.
- Banco de dados SQLite local para usuários e códigos OTP.
- Envio de OTP por email (API ou SMTP).

## Execução (prioridade: Python)

Como sua máquina bloqueia scripts PowerShell para `npm`, rode com Python.

## Configuração simples de OTP por API (recomendado)

Use API de e-mail (ex.: Brevo) para evitar configuração SMTP manual.

1. Copie o arquivo de exemplo:

```powershell
copy .env.example .env
```

2. No `.env`, mantenha:

```env
EMAIL_PROVIDER=api
EMAIL_API_URL=https://api.brevo.com/v3/smtp/email
EMAIL_API_KEY=sua_chave_api
EMAIL_API_SENDER_EMAIL=seu_email@seudominio.com
EMAIL_API_SENDER_NAME=Gestão de Gastos
PORT=3000
```

> Você só precisa da chave da API e do remetente autorizado no provedor.

## Alternativa: SMTP

Se preferir SMTP, no `.env` use:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_de_app
SMTP_SENDER=seu_email@gmail.com
SMTP_USE_TLS=true
SMTP_REQUIRE_AUTH=true
PORT=3000
```

## Rodar aplicação

```powershell
python app.py
```

ou

```powershell
py app.py
```

Aplicação disponível em `http://localhost:3000`.

## Como testar (fluxo OTP obrigatório)

1. Abra `http://localhost:3000`.
2. Faça o cadastro de email/senha.
3. Faça login com o mesmo email/senha.
4. O sistema envia OTP para o email informado.
5. Digite o OTP recebido para concluir login.

## Erro de envio OTP

Se aparecer erro no login, confira:
- `EMAIL_PROVIDER=api`: precisa `EMAIL_API_KEY` e `EMAIL_API_SENDER_EMAIL`.
- `EMAIL_PROVIDER=smtp`: precisa `SMTP_HOST`, `SMTP_SENDER` e credenciais quando `SMTP_REQUIRE_AUTH=true`.

## Endpoints

- `POST /api/register` — cadastro de usuário.
- `POST /api/login` — valida credenciais, gera OTP e envia por email.
- `POST /api/verify-otp` — valida OTP e conclui login.
