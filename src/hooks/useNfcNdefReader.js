/**
 * hooks/useNfcNdefReader.js
 * Lee el primer registro NDEF Text de un tag NFC.
 */
import { useState, useCallback } from 'react';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

const ndefTextToString = (payload) => {
  if (!payload || payload.length === 0) return null;
  try {
    const langLen = payload[0] & 0x3f;
    const textBytes = payload.slice(1 + langLen);
    return textBytes.map(c => String.fromCharCode(c)).join('');
  } catch { return null; }
};

export const useNfcNdefReader = () => {
  const [isReading, setIsReading] = useState(false);
  const [error,     setError]     = useState(null);
  const [nfcText,   setNfcText]   = useState(null);
  const [nfcUid,    setNfcUid]    = useState(null);

  const reset = useCallback(() => {
    setError(null);
    setNfcText(null);
    setNfcUid(null);
  }, []);

  const readTag = useCallback(async () => {
    setIsReading(true);
    setError(null);
    setNfcText(null);

    try {
      // 1. Verificar soporte y estado
      const supported = await NfcManager.isSupported();
      if (!supported) throw new Error('Este dispositivo no tiene hardware NFC.');

      const enabled = await NfcManager.isEnabled();
      if (!enabled) throw new Error('El NFC está desactivado. Actívalo en Ajustes → Conexiones → NFC.');

      await NfcManager.start();

      // 2. Solicitar tecnología NDEF
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // 3. Leer tag
      const tag = await NfcManager.getTag();
      console.log('[NFC] Tag leído:', JSON.stringify(tag));

      const uid = tag?.id
        ? Array.from(tag.id).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
        : 'unknown';
      setNfcUid(uid);

      // 4. Extraer mensaje NDEF
      const ndefMsg = tag?.ndefMessage;
      if (!ndefMsg || ndefMsg.length === 0) {
        throw new Error('El tag no contiene datos NDEF. ¿Fue sellado correctamente?');
      }

      const record = ndefMsg[0];
      console.log('[NFC] Record TNF:', record.tnf, 'payload len:', record.payload?.length);

      const text = ndefTextToString(record.payload);
      if (!text) throw new Error('No se pudo decodificar el registro NDEF.');

      console.log('[NFC] Texto leído:', text.slice(0, 20) + '...');
      setNfcText(text);
      return { success: true, text, uid };

    } catch (err) {
      const msg = err?.message || String(err) || 'Error desconocido al leer el tag';
      console.warn('[NFC] readTag error:', msg);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch (e) {
        console.warn('[NFC] cancelTechnologyRequest:', e?.message);
      }
      setIsReading(false);
    }
  }, []);

  return { isReading, error, nfcText, nfcUid, readTag, reset };
};
