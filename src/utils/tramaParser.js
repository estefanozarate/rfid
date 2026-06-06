/**
 * utils/tramaParser.js
 * Parser compartido entre NuevoSello y NuevaValidacion.
 * Formato: {tipo}{numId}{yymmdd}(10){firmante}(17){docId}(0){textoLibre}
 */
export const parseTrama = (raw) => {
  try {
    const s = raw.trim();
    const tipo = s[0];
    if (tipo !== '0' && tipo !== '1') return null;

    const numLen = tipo === '1' ? 8 : 11;
    const numId  = s.slice(1, 1 + numLen);
    if (numId.length !== numLen || !/^\d+$/.test(numId)) return null;

    const rest     = s.slice(1 + numLen);
    const fechaRaw = rest.slice(0, 6);
    if (!/^\d{6}$/.test(fechaRaw)) return null;

    const yy = fechaRaw.slice(0, 2);
    const mm = fechaRaw.slice(2, 4);
    const dd = fechaRaw.slice(4, 6);
    const fecha = `${dd}/${mm}/20${yy}`;

    const afterFecha = rest.slice(6);
    const idx10 = afterFecha.indexOf('(10)');
    if (idx10 === -1) return null;

    const after10 = afterFecha.slice(idx10 + 4);
    const idx17   = after10.indexOf('(17)');
    if (idx17 === -1) return null;

    const firmanteStr = after10.slice(0, idx17);
    if (!/^\d+$/.test(firmanteStr)) return null;
    const firmante = parseInt(firmanteStr, 10);

    const after17 = after10.slice(idx17 + 4);
    const idx0    = after17.indexOf('(0)');

    const docId      = idx0 === -1 ? after17 : after17.slice(0, idx0);
    const textoLibre = idx0 === -1 ? '' : after17.slice(idx0 + 3);

    if (!docId) return null;

    return { tipo, numero: numId, fecha, id: firmante, docId, textoLibre, raw: s };
  } catch { return null; }
};

// Separador para vincular UID del tag al payload de firma
const UID_SEP = '|UID:';

/**
 * Construye el payload que se firma: trama + separador + uid
 * Compartido entre NuevoSelloScreen, NuevaValidacionScreen y SellosScreen
 */
export const buildSignPayload = (trama, uid) => `${trama}${UID_SEP}${uid}`;
