const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')
const fs = require('fs')

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(path.join(dataDir, 'coffee.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','barista')),
      display_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS drinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      milk_ml REAL NOT NULL DEFAULT 0,
      coffee_g REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      threshold REAL NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS daily_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_date TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      total_cups INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(record_date)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      drink_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY(record_id) REFERENCES daily_records(id) ON DELETE CASCADE,
      FOREIGN KEY(drink_id) REFERENCES drinks(id)
    );

    CREATE TABLE IF NOT EXISTS ingredient_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY(record_id) REFERENCES daily_records(id) ON DELETE CASCADE,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_sale_record ON sale_items(record_id);
    CREATE INDEX IF NOT EXISTS idx_usage_record ON ingredient_usage(record_id);
  `)

  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt
  if (userCount === 0) {
    const hashOwner = bcrypt.hashSync('owner123', 10)
    const hashBarista = bcrypt.hashSync('barista123', 10)
    const insertUser = db.prepare(
      'INSERT INTO users (username, password, role, display_name) VALUES (?,?,?,?)'
    )
    insertUser.run('owner', hashOwner, 'owner', '李老板')
    insertUser.run('barista', hashBarista, 'barista', '小王咖啡师')
  }

  const drinkCount = db.prepare('SELECT COUNT(*) as cnt FROM drinks').get().cnt
  if (drinkCount === 0) {
    const insertDrink = db.prepare(
      'INSERT INTO drinks (name, price, milk_ml, coffee_g) VALUES (?,?,?,?)'
    )
    insertDrink.run('美式咖啡', 18, 0, 20)
    insertDrink.run('拿铁咖啡', 26, 180, 20)
    insertDrink.run('卡布奇诺', 25, 150, 20)
    insertDrink.run('摩卡咖啡', 28, 160, 18)
    insertDrink.run('燕麦拿铁', 30, 180, 20)
    insertDrink.run('冰美式', 18, 0, 20)
    insertDrink.run('生椰拿铁', 28, 200, 18)
    insertDrink.run('Dirty', 28, 120, 24)
  }

  const ingCount = db.prepare('SELECT COUNT(*) as cnt FROM ingredients').get().cnt
  if (ingCount === 0) {
    const insertIng = db.prepare(
      'INSERT INTO ingredients (name, unit, stock, threshold) VALUES (?,?,?,?)'
    )
    insertIng.run('咖啡豆', 'g', 5000, 1500)
    insertIng.run('全脂牛奶', 'ml', 20000, 5000)
    insertIng.run('燕麦奶', 'ml', 6000, 2000)
    insertIng.run('椰乳', 'ml', 5000, 1500)
  }
}

initDB()

module.exports = db
