const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, 'database.json');

function ensureDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    const initialData = {
      users: [],
      otps: [],
      counters: { userId: 1, otpId: 1 },
    };
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDatabase() {
  ensureDatabase();
  const raw = fs.readFileSync(DATABASE_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDatabase(data) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  readDatabase,
  writeDatabase,
  ensureDatabase,
};
