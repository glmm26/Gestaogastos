# Gestão de Gastos

Protótipo inicial com:
- Splash screen na tela principal.
- Tela de autenticação com cadastro simples (email e senha).
- Login em duas etapas com OTP.
- Banco de dados SQLite local para usuários e códigos OTP.

## Execução (prioridade: Python)

Como sua máquina bloqueia scripts PowerShell para `npm`, rode com Python:

```powershell
python app.py
```

Se sua instalação usar launcher do Windows:

```powershell
py app.py
```

Aplicação disponível em `http://localhost:3000`.

## Como testar pelo front-end

1. Abra `http://localhost:3000`.
2. Aguarde o splash ou clique em **Acessar**.
3. Faça o **Cadastro** (email + senha).
4. Vá para **Login**, informe o mesmo email/senha e clique em **Enviar OTP**.
5. Copie o OTP exibido na mensagem de desenvolvimento e valide em **Código OTP**.

## Endpoints

- `POST /api/register` — cadastro de usuário.
- `POST /api/login` — valida credenciais e gera OTP.
- `POST /api/verify-otp` — valida OTP e conclui login.

> Em ambiente local, o OTP é exibido no retorno da API para facilitar testes.
