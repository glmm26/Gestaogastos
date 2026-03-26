const fs = require('fs');
const path = require('path');

const CAMINHO_BANCO_DADOS = path.join(__dirname, 'database.json');

function criarDadosIniciais() {
  return {
    users: [],
    pendingUsers: [],
    otps: [],
    transactions: [],
    investments: [],
    goals: [],
    customCategories: [],
    reports: [],
    counters: {
      userId: 1,
      otpId: 1,
      transactionId: 1,
      investmentId: 1,
      goalId: 1,
      reportId: 1,
      categoryId: 1,
      pendingUserId: 1,
    },
  };
}

function garantirBancoDados() {
  if (!fs.existsSync(CAMINHO_BANCO_DADOS)) {
    fs.writeFileSync(CAMINHO_BANCO_DADOS, JSON.stringify(criarDadosIniciais(), null, 2), 'utf-8');
  }
}

function garantirContador(dados, chave) {
  if (typeof dados.counters[chave] !== 'number' || Number.isNaN(dados.counters[chave])) {
    dados.counters[chave] = 1;
  }
}

function normalizarColecao(dados, chave) {
  if (!Array.isArray(dados[chave])) {
    dados[chave] = [];
  }
}

function lerBancoDados() {
  garantirBancoDados();
  const conteudoBruto = fs.readFileSync(CAMINHO_BANCO_DADOS, 'utf-8');
  const dados = JSON.parse(conteudoBruto);

  normalizarColecao(dados, 'users');
  normalizarColecao(dados, 'pendingUsers');
  normalizarColecao(dados, 'otps');
  normalizarColecao(dados, 'transactions');
  normalizarColecao(dados, 'investments');
  normalizarColecao(dados, 'goals');
  normalizarColecao(dados, 'customCategories');
  normalizarColecao(dados, 'reports');

  if (!dados.counters || typeof dados.counters !== 'object') {
    dados.counters = {};
  }

  garantirContador(dados, 'userId');
  garantirContador(dados, 'otpId');
  garantirContador(dados, 'transactionId');
  garantirContador(dados, 'investmentId');
  garantirContador(dados, 'goalId');
  garantirContador(dados, 'reportId');
  garantirContador(dados, 'categoryId');
  garantirContador(dados, 'pendingUserId');

  return dados;
}

function escreverBancoDados(dados) {
  fs.writeFileSync(CAMINHO_BANCO_DADOS, JSON.stringify(dados, null, 2), 'utf-8');
}

module.exports = {
  lerBancoDados,
  escreverBancoDados,
  garantirBancoDados,
};
