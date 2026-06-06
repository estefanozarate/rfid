/**
 * hooks/useNfcWriter.js
 * Flujo:
 *   1. getTagUid()  → lee el UID sin escribir nada (para incluirlo en la firma)
 *   2. writeTag()   → escribe el texto NDEF en el tag
 *
 * El UID se lee ANTES de firmar para vincularlo criptográficamente.
 */
import { useState, useCallback } from 'react';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

const getUidFromTag = (tag) => {
  if (!tag?.id) return 'unknown';
  return Array.from(tag.id)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
};

const cancelSafe = async () => {
  try { await NfcManager.cancelTechnologyRequest(); } catch {}
};

// ── Leer solo el UID (sin escribir) ──────────────────────
export const useNfcUidReader = () => {
  const [isReading, setIsReading] = useState(false);
  const [uid,       setUid]       = useState(null);
  const [error,     setError]     = useState(null);

  const reset = useCallback(() => { setUid(null); setError(null); }, []);

  const readUid = useCallback(async () => {
    setIsReading(true);
    setError(null);
    try {
      const supported = await NfcManager.isSupported();
      if (!supported) throw new Error('Este dispositivo no tiene hardware NFC.');
      const enabled = await NfcManager.isEnabled();
      if (!enabled) throw new Error('El NFC está desactivado. Actívalo en Ajustes.');
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const uid = getUidFromTag(tag);
      setUid(uid);
      return { success: true, uid };
    } catch (err) {
      const msg = err?.message || 'Error al leer el tag';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      await cancelSafe();
      setIsReading(false);
    }
  }, []);

  return { isReading, uid, error, readUid, reset };
};

// ── Escribir NDEF ─────────────────────────────────────────
export const useNfcWriter = () => {
  const [isWriting, setIsWriting] = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(false);
  const [nfcUid,    setNfcUid]    = useState(null);

  const reset = useCallback(() => {
    setError(null); setSuccess(false); setNfcUid(null);
  }, []);

  const writeTag = useCallback(async (text) => {
    setIsWriting(true);
    setError(null);
    setSuccess(false);

    try {
      const supported = await NfcManager.isSupported();
      if (!supported) throw new Error('Este dispositivo no tiene hardware NFC.');
      const enabled = await NfcManager.isEnabled();
      if (!enabled) throw new Error('El NFC está desactivado. Actívalo en Ajustes.');
      await NfcManager.start();

      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);

      // Intentar escribir como NDEF
      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const tag    = await NfcManager.getTag();
        const uid    = getUidFromTag(tag);
        setNfcUid(uid);

        const status = await NfcManager.ndefHandler.getNdefStatus();
        if (status.status === 3) throw new Error('Este tag NFC es de solo lectura.');

        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('[NFC] Escritura NDEF OK, uid:', uid);
        setSuccess(true);
        return { success: true, uid };

      } catch (ndefErr) {
        await cancelSafe();
        const isFormatErr = ndefErr?.message?.includes('not a NDEF') ||
                            ndefErr?.message?.includes('NDEF') ||
                            ndefErr?.message?.includes('IOException');
        if (!isFormatErr) throw ndefErr;

        // Tag virgen — formatear y escribir
        console.log('[NFC] Tag no NDEF, formateando...');
        await NfcManager.requestTechnology(NfcTech.NdefFormatable);
        const tag = await NfcManager.getTag();
        const uid = getUidFromTag(tag);
        setNfcUid(uid);
        await NfcManager.ndefFormatableHandlerAndroid.formatAndWriteNdefMessage(bytes);
        console.log('[NFC] Tag formateado y escrito, uid:', uid);
        setSuccess(true);
        return { success: true, uid, formatted: true };
      }

    } catch (err) {
      const msg = err?.message || 'Error al escribir el tag';
      console.warn('[NFC] writeTag error:', msg);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      await cancelSafe();
      setIsWriting(false);
    }
  }, []);

  return { isWriting, error, success, nfcUid, writeTag, reset };
};
