const Database = require('better-sqlite3')
const db = new Database('./servidor/natchar.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS papelera (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    reserva_id   INTEGER,
    nombre       TEXT,
    telefono     TEXT,
    correo       TEXT,
    fecha        TEXT,
    personas     INTEGER,
    horario      TEXT,
    nota         TEXT,
    razon        TEXT,
    eliminada_en TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS log_acciones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    accion    TEXT NOT NULL,
    detalle   TEXT,
    fecha_log TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

console.log('✦ Migración exitosa')
db.close()