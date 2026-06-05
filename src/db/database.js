/**
 * db/database.js
 * Tablas: personas, sellos, validaciones, whitelist
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'stamping.db';
let db = null;

export const getDatabase = () => {
  if (!db) db = SQLite.openDatabaseSync(DB_NAME);
  return db;
};

export const initDatabase = () => {
  const db = getDatabase();

  // Tabla personas (seed de firmantes)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS personas (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre   TEXT NOT NULL,
      apellido TEXT NOT NULL,
      address  TEXT NOT NULL UNIQUE
    );
  `);

  // Tabla whitelist (descargada del backend)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS whitelist (
      id         INTEGER PRIMARY KEY,
      address    TEXT NOT NULL UNIQUE,
      label      TEXT,
      registered TEXT,
      synced_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // Tabla sellos (documentos sellados)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sellos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      trama        TEXT NOT NULL,
      doc_id       TEXT,
      firmante_id  INTEGER,
      tipo_doc     TEXT,
      num_id       TEXT,
      fecha_venc   TEXT,
      texto_libre  TEXT,
      firma_hex    TEXT,
      nfc_uid      TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  // Tabla validaciones (verificaciones realizadas)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS validaciones (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      trama        TEXT NOT NULL,
      doc_id       TEXT,
      firmante_id  INTEGER,
      firma_hex    TEXT,
      address_found TEXT,
      resultado    TEXT NOT NULL,
      detalle      TEXT,
      nfc_uid      TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed personas si está vacía
  const count = db.getFirstSync('SELECT COUNT(*) as total FROM personas;');
  if (count?.total === 0) {
    const seed = [
      { nombre:'Juan',    apellido:'Perez',   address:'0x7A3B5C1D9E2F4A6B8C0D1E2F3A4B5C6D7E8F9A01' },
      { nombre:'Maria',   apellido:'Gomez',   address:'0x1F2E3D4C5B6A79887766554433221100FFEEDDCC' },
      { nombre:'Carlos',  apellido:'Rojas',   address:'0xABCDEF1234567890ABCDEF1234567890ABCDEF12' },
      { nombre:'Ana',     apellido:'Torres',  address:'0x9876543210FEDCBA9876543210FEDCBA98765432' },
      { nombre:'Luis',    apellido:'Vargas',  address:'0x11223344556677889900AABBCCDDEEFF00112233' },
    ];
    const stmt = db.prepareSync('INSERT OR IGNORE INTO personas (nombre, apellido, address) VALUES (?,?,?);');
    try { for (const p of seed) stmt.executeSync([p.nombre, p.apellido, p.address]); }
    finally { stmt.finalizeSync(); }
  }

  console.log('[DB] Inicializada:', DB_NAME);
};
