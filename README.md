# Gestão de Gastos

Protótipo inicial com:
- Splash screen na tela principal.
- Tela de autenticação com cadastro simples (email e senha).
- Login em duas etapas com OTP.
- Banco de dados local em arquivo JSON para usuários e códigos OTP.

## Como executar

```bash
npm start
```

Aplicação disponível em `http://localhost:3000`.

## Endpoints

- `POST /api/register` — cadastro de usuário.
- `POST /api/login` — valida credenciais e gera OTP.
- `POST /api/verify-otp` — valida OTP e conclui login.

> Em ambiente local, o OTP é exibido no retorno da API para facilitar testes.
