/* ================================
   NATCHAR — Base de datos
   SQLite — vive en un solo archivo
   Se crea sola la primera vez
================================ */

const Database = require('better-sqlite3')
const path = require('path')

// El archivo .db se crea automáticamente
// en la carpeta servidor/
const db = new Database(path.join(__dirname, 'natchar.db'))

// Crear la tabla de reservas si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS reservas (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    telefono  TEXT NOT NULL,
    correo    TEXT,
    fecha     TEXT NOT NULL,
    personas  INTEGER NOT NULL,
    horario   TEXT NOT NULL,
    nota      TEXT,
    creada_en TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

console.log('✦ Base de datos lista')

module.exports = db