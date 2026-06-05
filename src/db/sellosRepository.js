import { getDatabase } from './database';

export const insertSello = (data) => {
  const db = getDatabase();
  const r  = db.runSync(
    `INSERT INTO sellos
     (trama_hash, trama, doc_id, firmante_id, tipo_doc, num_id, fecha_venc, texto_libre, firma_hex, nfc_uid)
     VALUES (?,?,?,?,?,?,?,?,?,?);`,
    [data.trama_hash, data.trama, data.doc_id, data.firmante_id,
     data.tipo_doc, data.num_id, data.fecha_venc,
     data.texto_libre || '', data.firma_hex, data.nfc_uid || '']
  );
  return r.lastInsertRowId;
};

export const getAllSellos = () => {
  const db = getDatabase();
  return db.getAllSync('SELECT * FROM sellos ORDER BY created_at DESC;');
};

export const getSellosByHash = (hash) => {
  const db = getDatabase();
  return db.getAllSync('SELECT * FROM sellos WHERE trama_hash = ? ORDER BY created_at DESC;', [hash]);
};

export const deleteSello = (id) => {
  const db = getDatabase();
  db.runSync('DELETE FROM sellos WHERE id = ?;', [id]);
};
