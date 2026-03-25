# Gestao de Gastos

Aplicacao web de gestao financeira com foco em simplicidade para iniciantes. O projeto roda com backend Node.js em `server.js`, persistencia local em `database.json` e interface SPA em HTML, CSS e JavaScript.

## O que o sistema oferece

- Splash screen com progresso automatico e entrada para o painel
- Cadastro com confirmacao por OTP enviado por email
- Login com bloqueio ate a confirmacao do cadastro
- Dashboard com resumo financeiro e graficos
- Movimentacoes com cadastro, edicao, exclusao e filtros
- Investimentos com simulacao guiada por perfil de risco
- Relatorios com resumo mensal e grafico de pizza
- Simulador de imposto de renda com aviso inicial e grafico simples

## Estrutura do projeto

- `server.js`: servidor HTTP e API principal
- `db.js`: leitura e escrita em `database.json`
- `database.json`: base local usada pela aplicacao
- `public/index.html`: estrutura da interface
- `public/app.js`: logica do front-end
- `public/styles.css`: estilos da aplicacao
- `.env.example`: exemplo de configuracao de ambiente

## Requisitos

- Node.js 18 ou superior

## Como executar

1. Copie o arquivo de ambiente, se quiser configurar envio real de email:

```powershell
copy .env.example .env
```

2. Instale dependencias, se necessario:

```powershell
npm install
```

3. Inicie o servidor:

```powershell
npm start
```

4. Abra no navegador:

```text
http://localhost:3000
```

## Fluxo principal

1. A splash screen aparece automaticamente ao abrir o sistema
2. O usuario cria uma conta com email e senha
3. O sistema envia um OTP para confirmar o cadastro
4. Depois da confirmacao, o usuario faz login
5. A navegacao libera acesso a:
   - `Dashboard`
   - `Movimentacoes`
   - `Investimentos`
   - `Impostos`
   - `Relatorios`

## Funcionalidades por area

### Dashboard

- Saldo atual, entradas e saidas
- Grafico por categoria
- Grafico comparando entradas e saidas
- Lista das movimentacoes recentes

### Movimentacoes

- Cadastro de receitas e despesas
- Categorias padrao e personalizadas
- Edicao e exclusao de registros
- Filtros por tipo, categoria e periodo

### Investimentos

- Simulacao simples por valor mensal
- Escolha de perfil:
  - `Baixo risco`: 8% ao ano
  - `Medio risco`: 12% ao ano
  - `Alto risco`: 18% ao ano
- Escolha de prazo com botoes
- Grafico de crescimento do dinheiro
- Lista de simulacoes salvas com detalhes, edicao e exclusao

### Impostos

- Simulador simples de imposto de renda
- Aviso inicial com opcao de nao mostrar novamente
- Campos para renda, outras rendas, dependentes, saude e educacao
- Resultado com faixa, aliquota, imposto estimado e renda liquida
- Sugestoes educativas e modal com dicas para reduzir imposto

### Relatorios

- Resumo geral do periodo
- Totais de entrada e saida
- Grafico de pizza por categoria
- Insights simples para leitura rapida

## OTP e email

O projeto usa confirmacao por OTP no cadastro. O envio tenta usar as variaveis de ambiente configuradas para email. Se o servico de email nao estiver disponivel, o backend pode retornar `devOtp` para testes locais.

## Observacoes importantes

- O backend ativo do projeto e `server.js`
- O antigo `app.py` nao faz parte do fluxo atual
- Os dados ficam salvos localmente em `database.json`
- Os graficos usam `Chart.js` carregado no front-end

## Scripts

```json
{
  "start": "node server.js"
}
```
