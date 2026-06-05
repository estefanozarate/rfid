/**
 * services/walletService.js
 * Dependencias: @noble/secp256k1 @noble/hashes expo-secure-store expo-crypto
 */
import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const SECURE_KEY_PRIVKEY = 'nfc_wallet_privkey';
const SECURE_KEY_ADDRESS = 'nfc_wallet_address';
export const API_BASE    = 'https://fileserver.locker/nfc/web/api';

const toHex   = (bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
const fromHex = (hex)   => new Uint8Array(hex.replace(/^0x/,'').match(/.{1,2}/g).map(b => parseInt(b,16)));

const pubKeyToAddress = (pubKey) => {
  const hash = keccak_256(pubKey.slice(1));
  return '0x' + toHex(hash.slice(-20));
};

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

  await SecureStore.setItemAsync(SECURE_KEY_PRIVKEY, privKeyHex);
  await SecureStore.setItemAsync(SECURE_KEY_ADDRESS, address);
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

export const signPayload = async (payload) => {
  const privKeyHex = await SecureStore.getItemAsync(SECURE_KEY_PRIVKEY);
  if (!privKeyHex) throw new Error('No hay wallet. Crea tu wallet primero.');
  const privKeyBytes = fromHex(privKeyHex);
  const msgHash      = keccak_256(new TextEncoder().encode(payload));
  const sig          = await secp.signAsync(msgHash, privKeyBytes);
  return toHex(sig.toCompactRawBytes());
};

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

export const registerWalletOnServer = async (label = 'Firmante') => {
  const address   = await SecureStore.getItemAsync(SECURE_KEY_ADDRESS);
  const device_id = await SecureStore.getItemAsync('nfc_device_id') || 'unknown';
  if (!address) throw new Error('No hay wallet generada.');
  const res = await fetch(`${API_BASE}/register.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, device_id, label }),
  });
  return res.json();
};

export const fetchWhitelist = async () => {
  const res  = await fetch(`${API_BASE}/wallets.php`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || 'Error al obtener lista blanca');
  return data.wallets;
};
