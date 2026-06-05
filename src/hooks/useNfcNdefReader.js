/**
 * hooks/useNfcNdefReader.js
 * Lee el primer registro NDEF Text de un tag.
 * Retorna el texto plano (la firma hex guardada al sellar).
 */
import { useState, useCallback } from 'react';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

const ndefTextPayloadToString = (payload) => {
  if (!payload || payload.length === 0) return null;
  const langLen = payload[0] & 0x3f;
  return payload.slice(1 + langLen).map(c => String.fromCharCode(c)).join('');
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
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Acerca el tag NFC para verificar',
      });

      const tag = await NfcManager.getTag();
      const uid = tag?.id
        ? Array.from(tag.id).map(b => b.toString(16).padStart(2,'0')).join(':').toUpperCase()
        : 'unknown';
      setNfcUid(uid);

      const ndefMsg = tag?.ndefMessage;
      if (!ndefMsg || ndefMsg.length === 0) throw new Error('Tag sin datos NDEF');

      const record  = ndefMsg[0];
      const text    = ndefTextPayloadToString(record.payload);
      if (!text) throw new Error('No se pudo leer el registro NDEF');

      setNfcText(text);
      return { success: true, text, uid };
    } catch (err) {
      const msg = err?.message || 'Error al leer el tag';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch {}
      setIsReading(false);
    }
  }, []);

  return { isReading, error, nfcText, nfcUid, readTag, reset };
};
