const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DIRETORIO_DADOS = path.join(__dirname, '..', 'data');
const CAMINHO_BANCO = path.join(DIRETORIO_DADOS, 'gestaogastos.db');
const DIRETORIO_MIGRATIONS = path.join(__dirname, 'migrations');

let db = null;

function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const applied = new Set(
    database.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name)
  );

  const migrationFiles = fs
    .readdirSync(DIRETORIO_MIGRATIONS)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const insertMigration = database.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

  migrationFiles.forEach((file) => {
    if (applied.has(file)) return;

    const sql = fs.readFileSync(path.join(DIRETORIO_MIGRATIONS, file), 'utf-8');
    const applyMigration = database.transaction(() => {
      database.exec(sql);
      insertMigration.run(file);
    });
    applyMigration();
    console.log(`Migration aplicada: ${file}`);
  });
}

function getDb() {
  if (db) return db;

  if (!fs.existsSync(DIRETORIO_DADOS)) {
    fs.mkdirSync(DIRETORIO_DADOS, { recursive: true });
  }

  db = new Database(CAMINHO_BANCO);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);

  return db;
}

module.exports = { getDb };
