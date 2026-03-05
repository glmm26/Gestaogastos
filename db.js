const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, 'database.json');

function ensureDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    const initialData = {
      users: [],
      otps: [],
      transactions: [],
      counters: { userId: 1, otpId: 1, transactionId: 1 },
    };
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDatabase() {
  ensureDatabase();
  const raw = fs.readFileSync(DATABASE_PATH, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.transactions)) data.transactions = [];
  if (!data.counters) data.counters = {};
  if (typeof data.counters.userId !== 'number') data.counters.userId = 1;
  if (typeof data.counters.otpId !== 'number') data.counters.otpId = 1;
  if (typeof data.counters.transactionId !== 'number') data.counters.transactionId = 1;

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
