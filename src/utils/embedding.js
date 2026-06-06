/**
 * utils/embedding.js
 * Descompresión de face embeddings (128 floats) leídos del QR.
 *
 * La web comprime el embedding a Float16 + Base64 (formato FD:B64:...).
 * Aquí lo descomprimimos de vuelta a Float32Array(128) para comparar
 * rostros con faceapi.euclideanDistance().
 *
 * React Native NO tiene:
 *   - Float16Array  → conversión manual con DataView (IEEE 754 half)
 *   - atob / btoa   → Base64 implementado manualmente
 *
 * Compatible con Expo SDK 50+. Sin dependencias externas.
 */

// ── Float16 → Float32 (IEEE 754 half-precision) ──────────────────────
const float16ToFloat32 = (h) => {
  const sign = (h & 0x8000) << 16;
  const exp  = (h >>> 10) & 0x1f;
  const mant = h & 0x3ff;

  let f32bits;
  if (exp === 0) {
    if (mant === 0) {
      f32bits = sign;                              // ±0
    } else {
      // Subnormal half → normalizar a float32
      let e = -1, m = mant;
      do { m <<= 1; e++; } while ((m & 0x400) === 0);
      m &= 0x3ff;
      f32bits = sign | ((127 - 15 - e) << 23) | (m << 13);
    }
  } else if (exp === 0x1f) {
    f32bits = sign | 0x7f800000 | (mant << 13);    // Inf / NaN
  } else {
    f32bits = sign | ((exp - 15 + 127) << 23) | (mant << 13); // normalizado
  }

  const buf  = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, f32bits, false);
  return view.getFloat32(0, false);
};

// ── Float32 → Float16 (por si la app necesita comprimir también) ─────
const float32ToFloat16 = (val) => {
  const fbuf  = new ArrayBuffer(4);
  const fview = new DataView(fbuf);
  fview.setFloat32(0, val, false);
  const x = fview.getUint32(0, false);

  const sign = (x >>> 16) & 0x8000;
  let   exp  = ((x >>> 23) & 0xff) - 127 + 15;
  let   mant = x & 0x7fffff;

  if (((x >>> 23) & 0xff) === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0);
  if (exp >= 0x1f) return sign | 0x7c00;
  if (exp <= 0) {
    if (exp < -10) return sign;
    mant = (mant | 0x800000) >>> (1 - exp);
    return sign | (mant >>> 13);
  }
  return sign | (exp << 10) | (mant >>> 13);
};

// ── Base64 manual (RN no tiene atob/btoa) ────────────────────────────
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const base64ToBytes = (b64) => {
  // Quitar padding y caracteres no válidos
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len   = clean.length;
  const outLen = Math.floor(len * 3 / 4);
  const bytes  = new Uint8Array(outLen);

  let byteIdx = 0;
  for (let i = 0; i < len; i += 4) {
    const e0 = B64_CHARS.indexOf(clean[i]);
    const e1 = B64_CHARS.indexOf(clean[i + 1]);
    const e2 = i + 2 < len ? B64_CHARS.indexOf(clean[i + 2]) : -1;
    const e3 = i + 3 < len ? B64_CHARS.indexOf(clean[i + 3]) : -1;

    const c0 = (e0 << 2) | (e1 >> 4);
    bytes[byteIdx++] = c0 & 0xff;
    if (e2 !== -1) {
      const c1 = ((e1 & 0x0f) << 4) | (e2 >> 2);
      bytes[byteIdx++] = c1 & 0xff;
    }
    if (e3 !== -1) {
      const c2 = ((e2 & 0x03) << 6) | e3;
      bytes[byteIdx++] = c2 & 0xff;
    }
  }
  return bytes;
};

const bytesToBase64 = (bytes) => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += (i + 1 < bytes.length) ? B64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += (i + 2 < bytes.length) ? B64_CHARS[b2 & 0x3f] : '=';
  }
  return out;
};

// ── API pública ──────────────────────────────────────────────────────

/**
 * Descomprime un Base64 (float16) → Float32Array(128).
 * Listo para pasar a faceapi.euclideanDistance().
 */
export const decodeEmbedding = (base64String) => {
  const bytes = base64ToBytes(base64String);
  const view  = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n     = Math.floor(bytes.length / 2);
  const out   = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = float16ToFloat32(view.getUint16(i * 2, false));
  }
  return out;
};

/**
 * Comprime un Float32Array → Base64 (float16). Simétrico a la web.
 */
export const encodeEmbedding = (float32Array) => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view   = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    view.setUint16(i * 2, float32ToFloat16(float32Array[i]), false);
  }
  return bytesToBase64(new Uint8Array(buffer));
};

/**
 * Extrae el embedding del textoLibre de un QR ya parseado.
 * textoLibre puede ser:
 *   - "FD:B64:<base64>"  → comprimido (nuevo)
 *   - "FD:<floats ASCII>" → legacy (separados por coma)
 *   - cualquier otra cosa → no hay embedding (null)
 *
 * @returns Float32Array o null
 */
export const extractEmbedding = (textoLibre) => {
  if (!textoLibre || typeof textoLibre !== 'string') return null;

  const fdIndex = textoLibre.indexOf('FD:');
  if (fdIndex === -1) return null;

  const fdPart = textoLibre.slice(fdIndex + 3); // tras "FD:"

  if (fdPart.startsWith('B64:')) {
    try { return decodeEmbedding(fdPart.slice(4)); }
    catch { return null; }
  }

  if (fdPart.length > 0) {
    // Legacy: floats ASCII separados por coma
    const parts = fdPart.split(',').map(parseFloat).filter(v => !isNaN(v));
    return parts.length ? new Float32Array(parts) : null;
  }

  return null;
};

/**
 * Distancia euclidiana entre dos embeddings (idéntica a faceapi).
 * < 0.6 suele indicar misma persona; ajustable según el umbral del modelo.
 */
export const euclideanDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};
