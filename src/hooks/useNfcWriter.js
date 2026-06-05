/**
 * hooks/useNfcWriter.js
 * Escribe texto NDEF en un tag NFC.
 * Si el tag no está formateado (NDEF) lo formatea automáticamente.
 */
import { useState, useCallback } from 'react';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export const useNfcWriter = () => {
  const [isWriting, setIsWriting] = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(false);
  const [nfcUid,    setNfcUid]    = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
    setNfcUid(null);
  }, []);

  const writeTag = useCallback(async (text) => {
    setIsWriting(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Verificar soporte y estado
      const supported = await NfcManager.isSupported();
      if (!supported) throw new Error('Este dispositivo no tiene hardware NFC.');

      const enabled = await NfcManager.isEnabled();
      if (!enabled) throw new Error('El NFC está desactivado. Actívalo en Ajustes → Conexiones → NFC.');

      await NfcManager.start();

      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);

      // 2. Intentar escribir como NDEF primero
      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);

        const tag = await NfcManager.getTag();
        const uid = getUid(tag);
        setNfcUid(uid);

        // Verificar si es read-only
        const status = await NfcManager.ndefHandler.getNdefStatus();
        if (status.status === 3) throw new Error('Este tag NFC es de solo lectura.');

        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('[NFC] Escritura NDEF exitosa, uid:', uid);
        setSuccess(true);
        return { success: true, uid };

      } catch (ndefErr) {
        console.warn('[NFC] NDEF falló:', ndefErr?.message);
        await cancelSafe();

        // 3. Si el tag no es NDEF, intentar formatearlo con NdefFormatable
        const isNotNdef = ndefErr?.message?.includes('not a NDEF') ||
                          ndefErr?.message?.includes('NDEF') ||
                          ndefErr?.message?.includes('TagLost') ||
                          ndefErr?.message?.includes('IOException');

        if (!isNotNdef) throw ndefErr; // error diferente, relanzar

        console.log('[NFC] Tag no NDEF — intentando formatear...');

        await NfcManager.requestTechnology(NfcTech.NdefFormatable);

        const tag = await NfcManager.getTag();
        const uid = getUid(tag);
        setNfcUid(uid);

        // formatAndWriteNdefMessage formatea el tag y escribe en un solo paso
        await NfcManager.ndefFormatableHandlerAndroid.formatAndWriteNdefMessage(bytes);
        console.log('[NFC] Tag formateado y escrito, uid:', uid);

        setSuccess(true);
        return { success: true, uid, formatted: true };
      }

    } catch (err) {
      const msg = err?.message || String(err) || 'Error desconocido al escribir el tag';
      console.warn('[NFC] writeTag error final:', msg);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      await cancelSafe();
      setIsWriting(false);
    }
  }, []);

  return { isWriting, error, success, nfcUid, writeTag, reset };
};

// ── Helpers ───────────────────────────────────────────────

const getUid = (tag) => {
  if (!tag?.id) return 'unknown';
  return Array.from(tag.id)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
};

const cancelSafe = async () => {
  try { await NfcManager.cancelTechnologyRequest(); } catch {}
};
