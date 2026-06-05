/**
 * services/walletService.js
 * ECDSA wallet compatible con Ethereum.
 *
 * IMPORTANTE: Este archivo usa @noble/secp256k1 v2 que requiere
 * que se configure el hmacSha256Sync antes de usar signAsync en RN.
 *
 * Dependencias:
 *   @noble/secp256k1@2.1.0
 *   @noble/hashes@1.4.0
 *   expo-secure-store@~13.0.2
 *   expo-crypto@~13.0.2
 */

import * as secp        from '@noble/secp256k1';
import { keccak_256 }   from '@noble/hashes/sha3';
import { hmac }         from '@noble/hashes/hmac';
import { sha256 }       from '@noble/hashes/sha256';
import * as SecureStore from 'expo-secure-store';
import * as Crypto      from 'expo-crypto';

// ── REQUERIDO para @noble/secp256k1 v2 en React Native ────
// Sin esto, signAsync lanza "crypto.getRandomValues is not a function"
secp.etc.hmacSha256Sync = (key, ...msgs) =>
  hmac(sha256, key, secp.etc.concatBytes(...msgs));

// ─────────────────────────────────────────────────────────

const SECURE_KEY_PRIVKEY = 'nfc_wallet_privkey';
const SECURE_KEY_ADDRESS = 'nfc_wallet_address';
export const API_BASE    = 'https://fileserver.locker/nfc/web/api';

// ── Utilidades ────────────────────────────────────────────

const toHex = (bytes) =>
  Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex) =>
  new Uint8Array(hex.replace(/^0x/, '').match(/.{1,2}/g).map(b => parseInt(b, 16)));

const pubKeyToAddress = (pubKey) => {
  // pubKey no comprimida: 0x04 + 32 X + 32 Y
  const hash = keccak_256(pubKey.slice(1));
  return '0x' + toHex(hash.slice(-20));
};

// ── Generar / Cargar wallet ───────────────────────────────

export const generateWallet = async () => {
  let privKeyBytes;
  let attempts = 0;

  do {
    const randomHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString() + Math.random().toString() + attempts
    );
    privKeyBytes = fromHex(randomHex);
    attempts++;
  } while (!secp.utils.isValidPrivateKey(privKeyBytes) && attempts < 10);

  const privKeyHex = toHex(privKeyBytes);
  const pubKey     = secp.getPublicKey(privKeyBytes, false); // 65 bytes no comprimida
  const address    = pubKeyToAddress(pubKey);

  await SecureStore.setItemAsync(SECURE_KEY_PRIVKEY, privKeyHex);
  await SecureStore.setItemAsync(SECURE_KEY_ADDRESS, address);

  console.log('[Wallet] Generada:', address);
  return { privateKey: privKeyHex, address };
};

export const loadWallet = async () => {
  const address = await SecureStore.getItemAsync(SECURE_KEY_ADDRESS);
  return address ? { address } : null;
};

export const hasWallet = async () => {
  const key = await SecureStore.getItemAsync(SECURE_KEY_PRIVKEY);
  return !!key;
};

// ── Firma ─────────────────────────────────────────────────

export const signPayload = async (payload) => {
  const privKeyHex = await SecureStore.getItemAsync(SECURE_KEY_PRIVKEY);
  if (!privKeyHex) throw new Error('No hay wallet. Créala desde la pantalla Wallet.');

  const privKeyBytes = fromHex(privKeyHex);
  const msgHash      = keccak_256(new TextEncoder().encode(payload));

  // sign (no async) funciona bien con hmacSha256Sync configurado
  const sig = secp.sign(msgHash, privKeyBytes);
  return toHex(sig.toCompactRawBytes());
};

// ── Verificación ──────────────────────────────────────────

export const verifySignature = (payload, sigHex, address) => {
  try {
    const msgHash  = keccak_256(new TextEncoder().encode(payload));
    const sigBytes = fromHex(sigHex);

    for (let recovery = 0; recovery <= 1; recovery++) {
      try {
        const sig       = secp.Signature.fromCompact(sigBytes).addRecoveryBit(recovery);
        const pubKey    = sig.recoverPublicKey(msgHash).toRawBytes(false);
        const recovered = pubKeyToAddress(pubKey);
        if (recovered.toLowerCase() === address.toLowerCase()) return true;
      } catch { continue; }
    }
    return false;
  } catch (err) {
    console.warn('[Wallet] verifySignature error:', err);
    return false;
  }
};

// ── Backend ───────────────────────────────────────────────

export const registerWalletOnServer = async (label = 'Firmante') => {
  const address   = await SecureStore.getItemAsync(SECURE_KEY_ADDRESS);
  const device_id = await SecureStore.getItemAsync('nfc_device_id') || 'unknown';
  if (!address) throw new Error('No hay wallet generada.');

  const res = await fetch(`${API_BASE}/register.php`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ address, device_id, label }),
  });
  return res.json();
};

export const fetchWhitelist = async () => {
  const res  = await fetch(`${API_BASE}/wallets.php`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || 'Error al obtener lista blanca');
  return data.wallets;
};
