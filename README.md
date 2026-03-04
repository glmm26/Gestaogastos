# Gestão de Gastos

Protótipo inicial com:
- Splash screen na tela principal.
- Tela de autenticação com cadastro simples (email e senha).
- Login em duas etapas com OTP.
- Banco de dados SQLite local para usuários e códigos OTP.
- Envio de OTP por email via SMTP.

## Execução (prioridade: Python)

Como sua máquina bloqueia scripts PowerShell para `npm`, rode com Python.

### 1) Configure SMTP (jeito mais simples: arquivo `.env`)

1. Copie o exemplo:

```powershell
copy .env.example .env
```

2. Edite o `.env` com seus dados reais de SMTP.

Exemplo:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_de_app
SMTP_SENDER=seu_email@gmail.com
SMTP_USE_TLS=true
SMTP_REQUIRE_AUTH=true
PORT=3000
```

> Para Gmail, use senha de app (não a senha normal da conta).

### Alternativa: configurar variáveis direto no PowerShell

```powershell
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USER="seu_email@gmail.com"
$env:SMTP_PASSWORD="sua_senha_de_app"
$env:SMTP_SENDER="seu_email@gmail.com"
$env:SMTP_USE_TLS="true"
$env:SMTP_REQUIRE_AUTH="true"
```

### 2) Suba a aplicação

```powershell
python app.py
```

Se sua instalação usar launcher do Windows:

```powershell
py app.py
```

Aplicação disponível em `http://localhost:3000`.

## Erro comum: "Configuração SMTP ausente"

Se aparecer erro como:

```text
Falha ao enviar OTP por email... Configuração SMTP ausente...
```

significa que o backend não encontrou variáveis SMTP (ou você abriu outro terminal sem elas). Use o `.env` ou configure as variáveis no mesmo terminal antes de rodar `python app.py`.

## Como testar pelo front-end

1. Abra `http://localhost:3000`.
2. Aguarde o splash ou clique em **Acessar**.
3. Faça o **Cadastro** (email + senha).
4. Vá para **Login**, informe o mesmo email/senha e clique em **Enviar OTP**.
5. Verifique o email usado no login.
6. Digite o OTP recebido no campo **Código OTP** e clique em **Validar OTP**.

## Endpoints

- `POST /api/register` — cadastro de usuário.
- `POST /api/login` — valida credenciais, gera OTP e envia por email.
- `POST /api/verify-otp` — valida OTP e conclui login.
