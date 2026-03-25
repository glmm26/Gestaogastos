# Gestao de Gastos

Aplicacao web de painel financeiro com:

- Splash screen e autenticacao com OTP de cadastro
- Dashboard com saldo, entradas, saidas e graficos
- Pagina de movimentacoes com categorias, filtros e cadastro
- Pagina de investimentos com lucro/prejuizo e evolucao
- Pagina de relatorios mensais com insights e exportacao HTML

## Estrutura

- `server.js`: servidor HTTP e API
- `db.js`: persistencia local em `database.json`
- `public/index.html`: SPA com secoes Dashboard, Movimentacoes, Investimentos e Relatorios
- `public/app.js`: logica do front-end
- `public/styles.css`: interface da aplicacao

## Como executar

1. Opcional: copie o exemplo de ambiente

```powershell
copy .env.example .env
```

2. Inicie o servidor

```powershell
node server.js
```

3. Abra no navegador

```text
http://localhost:3000
```

## Fluxo de uso

1. Crie uma conta com email e senha
2. Confirme o cadastro com o OTP enviado por email
3. Faca login com o mesmo email e senha
4. Navegue entre:
   - `Dashboard`
   - `Movimentacoes`
   - `Investimentos`
   - `Relatorios`

## Funcionalidades principais

### Dashboard

- Resumo financeiro do mes
- Grafico de pizza por categoria
- Grafico de barras de entradas vs saidas
- Ultimas movimentacoes

### Movimentacoes

- Cadastro com tipo, valor, data, categoria e observacoes
- Categorias padrao: `Salario`, `Alimentacao`, `Transporte`, `Lazer`, `Moradia`, `Outros`
- Categorias personalizadas
- Filtros por tipo, categoria e periodo

### Investimentos

- Cadastro com tipo, valor, data e rentabilidade
- Total investido
- Lucro/prejuizo estimado
- Grafico de evolucao

### Relatorios

- Geracao manual por mes
- Atualizacao automatica com base nos dados salvos
- Totais do mes, categorias principais e insights
- Exportacao em HTML

## Observacoes

- Os dados ficam salvos localmente em `database.json`
- O front usa `Chart.js` via CDN
- A API manteve compatibilidade com `/api/verify-email` e `/api/verify-otp`
- O backend ativo do projeto e `server.js`
