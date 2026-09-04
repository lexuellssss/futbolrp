const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/futbol.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    owner_id TEXT NOT NULL,
    budget INTEGER DEFAULT 50000000,
    form INTEGER DEFAULT 50,
    training_count INTEGER DEFAULT 0,
    tactics TEXT DEFAULT '4-3-3',
    style TEXT DEFAULT 'dengeli',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team_id INTEGER,
    position TEXT NOT NULL,
    overall INTEGER DEFAULT 70,
    value INTEGER DEFAULT 1000000,
    age INTEGER DEFAULT 22,
    sut INTEGER DEFAULT 70,
    pas INTEGER DEFAULT 70,
    defans INTEGER DEFAULT 70,
    hiz INTEGER DEFAULT 70,
    fizik INTEGER DEFAULT 70,
    top_kontrolu INTEGER DEFAULT 70,
    last_training TEXT,
    training_today INTEGER DEFAULT 0,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    team_id INTEGER,
    role TEXT DEFAULT 'uye',
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    from_team_id INTEGER,
    to_team_id INTEGER NOT NULL,
    offer_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'beklemede',
    offered_by TEXT NOT NULL,
    seasons INTEGER DEFAULT 1,
    wage INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (from_team_id) REFERENCES teams(id),
    FOREIGN KEY (to_team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    events TEXT,
    stats TEXT,
    played_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS lineups (
    team_id INTEGER PRIMARY KEY,
    starters TEXT,
    substitutes TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    seasons INTEGER NOT NULL,
    wage INTEGER DEFAULT 0,
    start_date TEXT DEFAULT CURRENT_TIMESTAMP,
    end_date TEXT,
    status TEXT DEFAULT 'aktif',
    transfer_id INTEGER,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week INTEGER NOT NULL,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    status TEXT DEFAULT 'planlandi',
    home_score INTEGER,
    away_score INTEGER,
    played_at TEXT,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS standings (
    team_id INTEGER PRIMARY KEY,
    played INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    drawn INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    gf INTEGER DEFAULT 0,
    ga INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );
`);

// Eski DB uyumluluğu — kolon yoksa ekler, varsa hata yutulur
try { db.exec(`ALTER TABLE transfers ADD COLUMN seasons INTEGER DEFAULT 1`); } catch (_) {}
try { db.exec(`ALTER TABLE transfers ADD COLUMN wage INTEGER DEFAULT 0`); } catch (_) {}

function updateTeamForm(teamId) {
  const team = db.prepare('SELECT training_count FROM teams WHERE id = ?').get(teamId);
  if (!team) return;

  let formBase = 50;
  let formPer = 2;
  let formMin = 20;
  let formMax = 100;

  try {
    const config = require('../config');
    formBase = config.formBase ?? 50;
    formPer = config.formPerTraining ?? 2;
    formMin = config.formMin ?? 20;
    formMax = config.formMax ?? 100;
  } catch (_) {}

  const newForm = Math.min(formMax, Math.max(formMin, formBase + (team.training_count * formPer)));
  db.prepare('UPDATE teams SET form = ? WHERE id = ?').run(newForm, teamId);
}

module.exports = { db, updateTeamForm };