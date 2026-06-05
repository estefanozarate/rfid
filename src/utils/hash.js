/**
 * utils/hash.js
 * Hash SHA256 de la trama completa → ID único del documento.
 * Usa @noble/hashes (ya instalado para ECDSA).
 */
import { sha256 } from '@noble/hashes/sha256';

const toHex = (bytes) =>
  Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * Genera el hash SHA256 de la trama completa.
 * @param {string} trama — trama completa incluyendo textoLibre
 * @returns {string} hex string de 64 chars
 */
export const hashTrama = (trama) => {
  const bytes = new TextEncoder().encode(trama);
  return toHex(sha256(bytes));
};

/**
 * Versión corta para display (primeros 8 chars).
 * @param {string} trama
 * @returns {string} e.g. "a3f2bc1d"
 */
export const shortHash = (trama) => hashTrama(trama).slice(0, 8);
