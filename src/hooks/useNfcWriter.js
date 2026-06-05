/**
 * hooks/useNfcWriter.js
 * Escribe un texto en un tag NFC como registro NDEF Text.
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
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Acerca el tag NFC para sellar',
      });

      const tag = await NfcManager.getTag();
      const uid = tag?.id
        ? Array.from(tag.id).map(b => b.toString(16).padStart(2,'0')).join(':').toUpperCase()
        : 'unknown';
      setNfcUid(uid);

      const bytes   = Ndef.encodeMessage([Ndef.textRecord(text)]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      setSuccess(true);
      return { success: true, uid };
    } catch (err) {
      const msg = err?.message || 'Error al escribir el tag';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch {}
      setIsWriting(false);
    }
  }, []);

  return { isWriting, error, success, nfcUid, writeTag, reset };
};
