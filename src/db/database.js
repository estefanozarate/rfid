/**
 * db/database.js
 * ──────────────────────────────────────────────────────────
 * Inicializa SQLite y crea la tabla personas.
 * Se llama UNA vez al arrancar la app desde App.js.
 * Si la tabla ya existe no hace nada (seguro en cada arranque).
 */

import * as SQLite from 'expo-sqlite';

// Nombre del archivo de la base de datos en el dispositivo
const DB_NAME = 'stamping.db';

// Instancia singleton de la DB
let db = null;

/**
 * Retorna la instancia de la DB (la crea si no existe).
 */
export const getDatabase = () => {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
};

/**
 * Crea la tabla personas si no existe e inserta los datos
 * de seed iniciales si la tabla está vacía.
 */
export const initDatabase = () => {
  const db = getDatabase();

  // Crear tabla
  db.execSync(`
    CREATE TABLE IF NOT EXISTS personas (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre   TEXT NOT NULL,
      apellido TEXT NOT NULL,
      address  TEXT NOT NULL UNIQUE
    );
  `);

  // Verificar si ya hay datos
  const count = db.getFirstSync('SELECT COUNT(*) as total FROM personas;');

  // Solo insertar seed si la tabla está vacía
  if (count?.total === 0) {
    const seed = [
      { id: 1,  nombre: 'Juan',    apellido: 'Perez',   address: '0x7A3B5C1D9E2F4A6B8C0D1E2F3A4B5C6D7E8F9A01'       },
      { id: 2,  nombre: 'Maria',   apellido: 'Gomez',   address: '0x1F2E3D4C5B6A79887766554433221100FFEEDDCC'       },
      { id: 3,  nombre: 'Carlos',  apellido: 'Rojas',   address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'       },
      { id: 4,  nombre: 'Ana',     apellido: 'Torres',  address: '0x9876543210FEDCBA9876543210FEDCBA98765432'       },
      { id: 5,  nombre: 'Luis',    apellido: 'Vargas',  address: '0x11223344556677889900AABBCCDDEEFF00112233'       },
      { id: 6,  nombre: 'Sofia',   apellido: 'Castro',  address: '0xFFEEDDCCBBAA0099887766554433221100AABBCC'       },
      { id: 7,  nombre: 'Pedro',   apellido: 'Lopez',   address: '0x55AA55AA55AA55AA55AA55AA55AA55AA55AA55AA'       },
      { id: 8,  nombre: 'Lucia',   apellido: 'Ramirez', address: '0x123456789ABCDEF0123456789ABCDEF012345678'       },
      { id: 9,  nombre: 'Diego',   apellido: 'Huaman',  address: '0xCAFEBABE1234567890ABCDEF1234567890ABCDEF'       },
      { id: 10, nombre: 'Valeria', apellido: 'Flores',  address: '0xDEADBEEF00112233445566778899AABBCCDDEEFF'       },
    ];

    const stmt = db.prepareSync(
      'INSERT OR IGNORE INTO personas (nombre, apellido, address) VALUES (?, ?, ?);'
    );

    try {
      for (const p of seed) {
        stmt.executeSync([p.nombre, p.apellido, p.address]);
      }
    } finally {
      stmt.finalizeSync();
    }

    console.log('[DB] Seed de 10 personas insertado correctamente.');
  }

  console.log('[DB] Base de datos inicializada:', DB_NAME);
};