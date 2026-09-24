const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Crear o abrir la base de datos
const db = new Database(path.resolve(__dirname, 'authguard.db'));

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    failed_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    two_factor_secret TEXT,
    two_factor_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    ip TEXT,
    success INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insertar usuarios de prueba (solo si la tabla está vacía)
const userCount = db.prepare('SELECT COUNT(*) as total FROM users').get().total;

if (userCount === 0) {
  const hash = bcrypt.hashSync('123456', 10);

  const insert = db.prepare(`
    INSERT INTO users (username, email, password, role)
    VALUES (?, ?, ?, ?)
  `);

  insert.run('admin', 'admin@authguard.com', hash, 'admin');
  insert.run('estudiante', 'estudiante@authguard.com', hash, 'user');
  insert.run('profesor', 'profesor@authguard.com', hash, 'user');

  console.log('✅ Usuarios de prueba creados:');
  console.log('   admin / 123456');
  console.log('   estudiante / 123456');
  console.log('   profesor / 123456');
}

module.exports = db;