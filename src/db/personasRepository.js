/**
 * db/personasRepository.js
 * ──────────────────────────────────────────────────────────
 * Todas las operaciones CRUD sobre la tabla personas.
 * Usa la API síncrona de expo-sqlite v14 (Expo 51).
 */

import { getDatabase } from './database';

// ─── INSERT ────────────────────────────────────────────────

/**
 * Inserta una nueva persona.
 * Lanza error si el address ya existe (UNIQUE constraint).
 * @returns {number} id del registro insertado
 */
export const insertPersona = (nombre, apellido, address) => {
  const db = getDatabase();
  const result = db.runSync(
    'INSERT INTO personas (nombre, apellido, address) VALUES (?, ?, ?);',
    [nombre.trim(), apellido.trim(), address.trim()]
  );
  return result.lastInsertRowId;
};

// ─── SELECT ────────────────────────────────────────────────

/**
 * Retorna todas las personas ordenadas por apellido.
 * @returns {Array<{id, nombre, apellido, address}>}
 */
export const getAllPersonas = () => {
  const db = getDatabase();
  return db.getAllSync(
    'SELECT * FROM personas ORDER BY apellido ASC, nombre ASC;'
  );
};

/**
 * Busca una persona por su address exacto (case-insensitive).
 * @returns {Object|null}
 */
export const getPersonaByAddress = (address) => {
  const db = getDatabase();
  return db.getFirstSync(
    'SELECT * FROM personas WHERE LOWER(address) = LOWER(?);',
    [address.trim()]
  ) || null;
};

/**
 * Busca una persona por su id.
 * @returns {Object|null}
 */
export const getPersonaById = (id) => {
  const db = getDatabase();
  return db.getFirstSync(
    'SELECT * FROM personas WHERE id = ?;',
    [id]
  ) || null;
};

/**
 * Busca personas cuyo nombre, apellido o address contengan el query.
 * @returns {Array}
 */
export const searchPersonas = (query) => {
  const db = getDatabase();
  const like = `%${query.trim()}%`;
  return db.getAllSync(
    `SELECT * FROM personas
     WHERE nombre   LIKE ?
        OR apellido LIKE ?
        OR address  LIKE ?
     ORDER BY apellido ASC, nombre ASC;`,
    [like, like, like]
  );
};

// ─── UPDATE ────────────────────────────────────────────────

/**
 * Actualiza los datos de una persona por id.
 * Solo actualiza los campos que se pasen (los demás se mantienen).
 */
export const updatePersona = (id, { nombre, apellido, address }) => {
  const db = getDatabase();
  db.runSync(
    `UPDATE personas
     SET nombre   = COALESCE(?, nombre),
         apellido = COALESCE(?, apellido),
         address  = COALESCE(?, address)
     WHERE id = ?;`,
    [nombre ?? null, apellido ?? null, address ?? null, id]
  );
};

// ─── DELETE ────────────────────────────────────────────────

/**
 * Elimina una persona por id.
 */
export const deletePersona = (id) => {
  const db = getDatabase();
  db.runSync('DELETE FROM personas WHERE id = ?;', [id]);
};

/**
 * Elimina todas las personas (útil para testing).
 */
export const clearPersonas = () => {
  const db = getDatabase();
  db.runSync('DELETE FROM personas;');
};

// ─── COUNT ─────────────────────────────────────────────────

/**
 * Retorna el total de personas registradas.
 * @returns {number}
 */
export const countPersonas = () => {
  const db = getDatabase();
  const result = db.getFirstSync('SELECT COUNT(*) as total FROM personas;');
  return result?.total ?? 0;
};