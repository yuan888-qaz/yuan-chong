const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径：默认本地 data/，生产可通过 DB_PATH 指向持久卷（如 Railway/Render 挂载目录）
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'yuanchong.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎮',
  color TEXT DEFAULT '#2563eb',
  description TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS goods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  orig_price REAL DEFAULT 0,
  badge TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  good_id INTEGER NOT NULL,
  game_name TEXT NOT NULL,
  good_name TEXT NOT NULL,
  price REAL NOT NULL,
  server TEXT NOT NULL,
  role_id TEXT NOT NULL,
  contact TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

module.exports = db;
