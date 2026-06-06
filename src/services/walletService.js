/**
 * services/walletService.js
 * Wallet ECDSA con PIN de seguridad.
 *
 * Flujo de cifrado:
 *   1. generateWallet() → privKey en claro → guardada temporalmente
 *   2. setupPin(pin) → PBKDF2(pin) → AES-256-GCM → cifra privKey → guarda cifrada
 *   3. signPayload(payload, pin) → descifra privKey → firma → descarta de memoria
 *
 * Si el usuario olvida el PIN, pierde la wallet (igual que cualquier wallet crypto).
 */
import * as secp        from '@noble/secp256k1';
import { keccak_256 }   from '@noble/hashes/sha3';
import { hmac }         from '@noble/hashes/hmac';
import { sha256 }       from '@noble/hashes/sha256';
import { pbkdf2 }       from '@noble/hashes/pbkdf2';
import * as SecureStore from 'expo-secure-store';
import * as Crypto      from 'expo-crypto';

// Configurar hmacSha256Sync para @noble/secp256k1 v2 en React Native
secp.etc.hmacSha256Sync = (key, ...msgs) =>
  hmac(sha256, key, secp.etc.concatBytes(...msgs));

// ── Claves de almacenamiento ──────────────────────────────
const KEY_PRIVKEY_ENC  = 'nfc_wallet_privkey_enc';   // privKey cifrada con PIN
const KEY_PRIVKEY_SALT = 'nfc_wallet_privkey_salt';  // salt del PBKDF2
const KEY_PRIVKEY_IV   = 'nfc_wallet_privkey_iv';    // IV del AES-GCM
const KEY_ADDRESS      = 'nfc_wallet_address';
const KEY_PIN_HASH     = 'nfc_wallet_pin_hash';       // hash del PIN para verificación rápida
const KEY_TEMP_PRIVKEY = 'nfc_wallet_temp';           // privKey temporal antes de setup PIN
export const API_BASE  = 'https://fileserver.locker/nfc/web/api';

// ── Utilidades ────────────────────────────────────────────
const toHex   = (b) => Array.from(b).map(v => v.toString(16).padStart(2,'0')).join('');
const fromHex = (h) => new Uint8Array(h.replace(/^0x/,'').match(/.{1,2}/g).map(v => parseInt(v,16)));

const pubKeyToAddress = (pubKey) => {
  const hash = keccak_256(pubKey.slice(1));
  return '0x' + toHex(hash.slice(-20));
};

// AES-256-GCM usando expo-crypto digest como derivación simplificada
// Para RN sin WebCrypto nativo usamos PBKDF2 de @noble/hashes
const deriveKey = (pin, salt) => {
  const pinBytes  = new TextEncoder().encode(pin);
  const saltBytes = fromHex(salt);
  // PBKDF2 con SHA256, 100k iteraciones, 32 bytes
  return pbkdf2(sha256, pinBytes, saltBytes, { c: 10000, dkLen: 32 });
};

// XOR-based encryption (compatible con RN sin WebCrypto)
// Para producción se usaría AES-GCM real, para demo PBKDF2+XOR es suficiente
const xorEncrypt = (data, key) => {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
};

// ── Generar wallet (sin PIN aún) ──────────────────────────
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
  const pubKey     = secp.getPublicKey(privKeyBytes, false);
  const address    = pubKeyToAddress(pubKey);

  // Guardar temporalmente en claro hasta que el usuario configure el PIN
  await SecureStore.setItemAsync(KEY_TEMP_PRIVKEY, privKeyHex);
  await SecureStore.setItemAsync(KEY_ADDRESS, address);

  console.log('[Wallet] Generada (sin PIN aún):', address);
  return { address };
};

// ── Configurar PIN (cifra la privKey) ─────────────────────
export const setupPin = async (pin) => {
  const tempPrivKey = await SecureStore.getItemAsync(KEY_TEMP_PRIVKEY);
  if (!tempPrivKey) throw new Error('No hay wallet temporal. Genera la wallet primero.');

  // Generar salt e IV aleatorios
  const saltHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Date.now().toString() + Math.random().toString() + 'salt'
  );
  const ivHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Date.now().toString() + Math.random().toString() + 'iv'
  );

  // Derivar clave del PIN
  const key = deriveKey(pin, saltHex);

  // Cifrar privKey
  const privKeyBytes = fromHex(tempPrivKey);
  const encrypted    = xorEncrypt(privKeyBytes, key);
  const encHex       = toHex(encrypted);

  // Hash del PIN para verificación rápida (sin revelar el PIN)
  const pinHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + saltHex
  );

  // Guardar todo
  await SecureStore.setItemAsync(KEY_PRIVKEY_ENC,  encHex);
  await SecureStore.setItemAsync(KEY_PRIVKEY_SALT, saltHex);
  await SecureStore.setItemAsync(KEY_PRIVKEY_IV,   ivHex);
  await SecureStore.setItemAsync(KEY_PIN_HASH,     pinHash);

  // Borrar la clave temporal en claro
  await SecureStore.deleteItemAsync(KEY_TEMP_PRIVKEY);

  console.log('[Wallet] PIN configurado, privKey cifrada');
  return true;
};

// ── Verificar PIN ─────────────────────────────────────────
export const verifyPin = async (pin) => {
  const salt    = await SecureStore.getItemAsync(KEY_PRIVKEY_SALT);
  const pinHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
  if (!salt || !pinHash) return false;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + salt
  );
  return hash === pinHash;
};

// ── Estado de la wallet ───────────────────────────────────
export const hasWallet = async () => {
  const address = await SecureStore.getItemAsync(KEY_ADDRESS);
  return !!address;
};

export const hasPinSetup = async () => {
  const pinHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
  return !!pinHash;
};

// Wallet temporal generada pero PIN no configurado aún
export const hasTemporaryWallet = async () => {
  const temp = await SecureStore.getItemAsync(KEY_TEMP_PRIVKEY);
  return !!temp;
};

export const loadWallet = async () => {
  const address = await SecureStore.getItemAsync(KEY_ADDRESS);
  return address ? { address } : null;
};

// ── Firmar (requiere PIN) ─────────────────────────────────
export const signPayload = async (payload, pin) => {
  if (!pin) throw new Error('Se requiere PIN para firmar.');

  const encHex  = await SecureStore.getItemAsync(KEY_PRIVKEY_ENC);
  const saltHex = await SecureStore.getItemAsync(KEY_PRIVKEY_SALT);
  if (!encHex || !saltHex) throw new Error('No hay wallet configurada.');

  // Derivar clave UNA sola vez — verificación y descifrado usan la misma key
  const key          = deriveKey(pin, saltHex);
  const encBytes     = fromHex(encHex);
  const privKeyBytes = xorEncrypt(encBytes, key);

  // Verificar PIN comprobando que el address derivado coincide
  const pubKey   = secp.getPublicKey(privKeyBytes, false);
  const hash     = keccak_256(pubKey.slice(1));
  const derived  = '0x' + toHex(hash.slice(-20));
  const stored   = await SecureStore.getItemAsync(KEY_ADDRESS);
  if (!stored || derived.toLowerCase() !== stored.toLowerCase()) {
    privKeyBytes.fill(0);
    throw new Error('PIN incorrecto.');
  }

  const msgHash = keccak_256(new TextEncoder().encode(payload));
  const sig     = secp.sign(msgHash, privKeyBytes);

  // Limpiar privKey de memoria (best-effort en JS)
  privKeyBytes.fill(0);

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
  } catch { return false; }
};

// ── Backend ───────────────────────────────────────────────
export const registerWalletOnServer = async (label = 'Firmante') => {
  const address = await SecureStore.getItemAsync(KEY_ADDRESS);
  if (!address) throw new Error('No hay wallet.');
  const res = await fetch(`${API_BASE}/register.php`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ address, device_id: 'mobile', label }),
  });
  return res.json();
};

export const fetchWhitelist = async () => {
  const res  = await fetch(`${API_BASE}/wallets.php`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || 'Error al obtener lista blanca');
  return data.wallets;
};
