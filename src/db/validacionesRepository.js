import { getDatabase } from './database';

export const insertValidacion = (data) => {
  const db = getDatabase();
  const r  = db.runSync(
    `INSERT INTO validaciones
     (trama_hash, trama, doc_id, firmante_id, tipo_doc, num_id, fecha_venc, texto_libre, firma_hex, address_found, resultado, detalle, nfc_uid)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);`,
    [data.trama_hash, data.trama, data.doc_id, data.firmante_id,
     data.tipo_doc || '', data.num_id || '', data.fecha_venc || '',
     data.texto_libre || '', data.firma_hex || '',
     data.address_found || '', data.resultado, data.detalle || '', data.nfc_uid || '']
  );
  return r.lastInsertRowId;
};

export const getAllValidaciones = () => {
  const db = getDatabase();
  return db.getAllSync('SELECT * FROM validaciones ORDER BY created_at DESC;');
};

// Agrupa por trama_hash — un doc puede tener N verificaciones
export const getValidacionesByHash = (hash) => {
  const db = getDatabase();
  return db.getAllSync(
    'SELECT * FROM validaciones WHERE trama_hash = ? ORDER BY created_at DESC;', [hash]
  );
};

// Lista de documentos únicos con su última verificación
export const getDocumentosValidados = () => {
  const db = getDatabase();
  return db.getAllSync(`
    SELECT trama_hash, trama, doc_id, tipo_doc, num_id, fecha_venc, texto_libre,
           COUNT(*) as total_verificaciones,
           SUM(CASE WHEN resultado = 'valido' THEN 1 ELSE 0 END) as total_validos,
           MAX(created_at) as ultima_verificacion,
           (SELECT resultado FROM validaciones v2
            WHERE v2.trama_hash = v.trama_hash
            ORDER BY v2.created_at DESC LIMIT 1) as ultimo_resultado
    FROM validaciones v
    GROUP BY trama_hash
    ORDER BY ultima_verificacion DESC;
  `);
};
