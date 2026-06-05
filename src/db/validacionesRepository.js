import { getDatabase } from './database';

export const insertValidacion = (data) => {
  const db = getDatabase();
  const r  = db.runSync(
    `INSERT INTO validaciones (trama, doc_id, firmante_id, firma_hex, address_found, resultado, detalle, nfc_uid)
     VALUES (?,?,?,?,?,?,?,?);`,
    [data.trama, data.doc_id, data.firmante_id, data.firma_hex || '',
     data.address_found || '', data.resultado, data.detalle || '', data.nfc_uid || '']
  );
  return r.lastInsertRowId;
};

export const getAllValidaciones = () => {
  const db = getDatabase();
  return db.getAllSync('SELECT * FROM validaciones ORDER BY created_at DESC;');
};

export const getValidacionById = (id) => {
  const db = getDatabase();
  return db.getFirstSync('SELECT * FROM validaciones WHERE id = ?;', [id]) || null;
};
