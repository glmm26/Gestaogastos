# Gestao de Gastos

Aplicacao web de gestao financeira com foco em simplicidade, visual moderno e uso pratico no dia a dia. O projeto usa backend em Node.js, persistencia local em arquivo JSON e frontend em HTML, CSS e JavaScript puro.

## Visao geral

O sistema permite:

- cadastro e login com confirmacao por OTP
- dashboard com resumo financeiro e graficos
- cadastro, edicao, filtros e exclusao de movimentacoes
- criacao e acompanhamento de metas financeiras
- simulacoes de investimento por perfil de risco
- simulador simples de imposto de renda
- exportacao de relatorios em HTML
- exportacao de relatorios em PDF com layout profissional
- pagina de perfil com foto e atualizacao de senha

## Tecnologias

- Node.js
- HTTP nativo com `server.js`
- `Chart.js` no frontend
- `Puppeteer` para gerar PDF
- persistencia local em `database.json`

## Estrutura do projeto

- `server.js`: servidor HTTP, rotas da API, exportacao HTML e PDF
- `db.js`: leitura, normalizacao e escrita do banco local
- `database.json`: base local da aplicacao
- `public/index.html`: interface principal
- `public/app.js`: comportamento do frontend
- `public/styles.css`: estilos da aplicacao
- `public/perfil.html`: tela de perfil
- `public/perfil.js`: logica da tela de perfil
- `public/perfil.css`: estilos da tela de perfil
- `templates/relatorio-pdf.html`: template usado na geracao dos relatorios
- `uploads/`: fotos de perfil enviadas pelos usuarios

## Requisitos

- Node.js 18 ou superior

## Instalacao

Instale as dependencias:

```powershell
npm install
```

## Configuracao

O projeto usa um arquivo `.env` na raiz. As variaveis atualmente usadas pelo backend sao:

```env
PORT=3000
EMAIL_PROVIDER=api
EMAIL_API_URL=https://api.brevo.com/v3/smtp/email
EMAIL_API_KEY=
EMAIL_API_SENDER_EMAIL=
EMAIL_API_SENDER_NAME=Gestao de Gastos
```

Observacoes:

- se o servico de email estiver configurado corretamente, o OTP e enviado por email
- se o envio falhar, o backend pode retornar `devOtp` para testes locais
- se a porta configurada ja estiver em uso, o servidor exibe uma mensagem indicando para liberar a porta ou iniciar em outra, como `3001`

## Como executar

Inicie o servidor:

```powershell
npm start
```

Ou, se preferir:

```powershell
node server.js
```

Depois abra:

```text
http://localhost:3000
```

Se quiser usar outra porta:

```powershell
$env:PORT=3001; node server.js
```

## Funcionalidades

### Autenticacao

- cadastro com nome, email e senha
- confirmacao por OTP
- login bloqueado ate a confirmacao
- sessao local no navegador

### Dashboard

- resumo de entradas, saidas e saldo
- grafico de gastos por categoria
- grafico de entradas vs saidas
- lista de movimentacoes recentes

### Movimentacoes

- cadastro de receitas e despesas
- categorias padrao e personalizadas
- edicao e exclusao
- filtros por tipo, categoria, mes e periodo
- confirmacao visual para exclusao

### Metas

- criacao de metas com valor alvo, valor atual, prazo e categoria
- atualizacao de status
- progresso visual com barra
- modal personalizado para somar progresso
- confirmacao visual para exclusao

### Investimentos

- simulacao por valor mensal
- perfis de risco:
  - `low`: baixo risco
  - `medium`: medio risco
  - `high`: alto risco
- projecao por anos
- grafico de crescimento
- lista de simulacoes salvas com detalhes
- confirmacao visual para exclusao

### Impostos

- simulador simples de imposto de renda
- aviso inicial antes de acesso
- resumo visual do resultado
- sugestoes educativas

### Relatorios

- geracao de relatorios mensais
- exportacao em HTML
- exportacao em PDF
- resumo financeiro
- insights automaticos
- lista de movimentacoes
- graficos incluidos no PDF a partir do dashboard
- arquivo PDF com nome no formato `relatorio_financeiro_{mes}.pdf`

## Rotas principais

### Frontend

- `/`
- `/perfil.html`

### API e acoes

- `/api/register`
- `/api/verify-email`
- `/api/login`
- `/api/dashboard`
- `/api/transactions`
- `/api/goals`
- `/api/investments`
- `/api/reports`
- `/api/reports/export`
- `/relatorios/pdf`
- `/perfil`
- `/perfil/foto`
- `/perfil/senha`

## Fluxo recomendado de uso

1. criar a conta
2. confirmar o cadastro com OTP
3. fazer login
4. cadastrar movimentacoes
5. acompanhar dashboard e metas
6. gerar relatorios
7. exportar em HTML ou PDF

## Observacoes importantes

- a aplicacao salva os dados localmente em `database.json`
- o backend principal do projeto e `server.js`
- os graficos sao renderizados no frontend com `Chart.js`
- o PDF e gerado no servidor com `Puppeteer`
- para o PDF incluir os graficos, o frontend envia as imagens capturadas dos charts no momento da exportacao

## Melhorias futuras sugeridas

- banco de dados relacional
- autenticacao com tokens mais robusta
- relatorios com filtros avancados
- testes automatizados
- deploy em ambiente de producao
