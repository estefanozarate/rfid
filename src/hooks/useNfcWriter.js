/**
 * hooks/useNfcWriter.js
 *
 * writeTagWithUid(pin, trama, buildPayloadFn):
 *   UNA sola sesión NFC:
 *   1. Conectar al tag
 *   2. Leer UID
 *   3. Llamar buildPayloadFn(uid) para obtener texto a firmar
 *   4. Escribir el texto resultante
 *   5. Cerrar sesión
 *
 * writeTag(text): escritura simple sin vinculación de UID
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

// ── Escritura con vinculación de UID en una sola sesión ───
export const useNfcWriterWithUid = () => {
  const [isWriting, setIsWriting] = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(false);
  const [nfcUid,    setNfcUid]    = useState(null);

  const reset = useCallback(() => {
    setError(null); setSuccess(false); setNfcUid(null);
  }, []);

  /**
   * @param {Function} buildTextFn - función async que recibe el UID y retorna el texto a escribir
   *   ej: async (uid) => { return await signPayload(buildSignPayload(trama, uid), pin); }
   */
  const writeTagWithUid = useCallback(async (buildTextFn) => {
    setIsWriting(true);
    setError(null);
    setSuccess(false);

    try {
      const supported = await NfcManager.isSupported();
      if (!supported) throw new Error('Este dispositivo no tiene hardware NFC.');
      const enabled = await NfcManager.isEnabled();
      if (!enabled) throw new Error('El NFC está desactivado. Actívalo en Ajustes.');
      await NfcManager.start();

      // Intentar con NDEF primero
      let uid, bytes;
      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const tag = await NfcManager.getTag();
        uid = getUidFromTag(tag);
        setNfcUid(uid);

        // Verificar read-only
        const status = await NfcManager.ndefHandler.getNdefStatus();
        if (status.status === 3) throw new Error('Este tag NFC es de solo lectura.');

        // Construir el texto a escribir (firma con UID incluido)
        const text = await buildTextFn(uid);
        bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);

        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('[NFC] Escritura OK, uid:', uid);

      } catch (ndefErr) {
        await cancelSafe();
        const isFormatErr = ndefErr?.message?.includes('not a NDEF') ||
                            ndefErr?.message?.includes('IOException');
        if (!isFormatErr) throw ndefErr;

        // Tag virgen — formatear
        console.log('[NFC] Tag virgen, formateando...');
        await NfcManager.requestTechnology(NfcTech.NdefFormatable);
        const tag2 = await NfcManager.getTag();
        uid = getUidFromTag(tag2);
        setNfcUid(uid);

        const text = await buildTextFn(uid);
        bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
        await NfcManager.ndefFormatableHandlerAndroid.formatAndWriteNdefMessage(bytes);
        console.log('[NFC] Tag formateado y escrito, uid:', uid);
      }

      setSuccess(true);
      return { success: true, uid };

    } catch (err) {
      const msg = err?.message || 'Error al escribir el tag';
      console.warn('[NFC] writeTagWithUid error:', msg);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      await cancelSafe();
      setIsWriting(false);
    }
  }, []);

  return { isWriting, error, success, nfcUid, writeTagWithUid, reset };
};

// ── Escritura simple (sin vinculación UID) ────────────────
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

      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const tag = await NfcManager.getTag();
        const uid = getUidFromTag(tag);
        setNfcUid(uid);

        const status = await NfcManager.ndefHandler.getNdefStatus();
        if (status.status === 3) throw new Error('Este tag NFC es de solo lectura.');

        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        setSuccess(true);
        return { success: true, uid };

      } catch (ndefErr) {
        await cancelSafe();
        const isFormatErr = ndefErr?.message?.includes('not a NDEF') ||
                            ndefErr?.message?.includes('IOException');
        if (!isFormatErr) throw ndefErr;

        await NfcManager.requestTechnology(NfcTech.NdefFormatable);
        const tag = await NfcManager.getTag();
        const uid = getUidFromTag(tag);
        setNfcUid(uid);
        await NfcManager.ndefFormatableHandlerAndroid.formatAndWriteNdefMessage(bytes);
        setSuccess(true);
        return { success: true, uid, formatted: true };
      }

    } catch (err) {
      const msg = err?.message || 'Error al escribir el tag';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      await cancelSafe();
      setIsWriting(false);
    }
  }, []);

  return { isWriting, error, success, nfcUid, writeTag, reset };
};
