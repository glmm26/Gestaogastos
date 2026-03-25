const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, 'database.json');

function createInitialData() {
  return {
    users: [],
    otps: [],
    transactions: [],
    investments: [],
    customCategories: [],
    reports: [],
    counters: {
      userId: 1,
      otpId: 1,
      transactionId: 1,
      investmentId: 1,
      reportId: 1,
      categoryId: 1,
    },
  };
}

function ensureDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(createInitialData(), null, 2), 'utf-8');
  }
}

function ensureCounter(data, key) {
  if (typeof data.counters[key] !== 'number' || Number.isNaN(data.counters[key])) {
    data.counters[key] = 1;
  }
}

function normalizeCollection(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
}

function readDatabase() {
  ensureDatabase();
  const raw = fs.readFileSync(DATABASE_PATH, 'utf-8');
  const data = JSON.parse(raw);

  normalizeCollection(data, 'users');
  normalizeCollection(data, 'otps');
  normalizeCollection(data, 'transactions');
  normalizeCollection(data, 'investments');
  normalizeCollection(data, 'customCategories');
  normalizeCollection(data, 'reports');

  if (!data.counters || typeof data.counters !== 'object') {
    data.counters = {};
  }

  ensureCounter(data, 'userId');
  ensureCounter(data, 'otpId');
  ensureCounter(data, 'transactionId');
  ensureCounter(data, 'investmentId');
  ensureCounter(data, 'reportId');
  ensureCounter(data, 'categoryId');

  return data;
}

function writeDatabase(data) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  readDatabase,
  writeDatabase,
  ensureDatabase,
};
