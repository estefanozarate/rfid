import { useState, useCallback, useRef } from 'react';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

export const useNfcWriter = () => {
  const [isSupported, setIsSupported] = useState(null);
  const [isWriting,   setIsWriting]   = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState(null);

  const sessionActiveRef = useRef(false);

  const checkNfcSupport = useCallback(async () => {
    try {
      const supported = await NfcManager.isSupported();
      setIsSupported(supported);
      if (supported) await NfcManager.start();
      return supported;
    } catch (err) {
      console.warn('[NfcWriter] checkNfcSupport error:', err);
      setIsSupported(false);
      return false;
    }
  }, []);

  const _cleanup = useCallback(async () => {
    try { await NfcManager.cancelTechnologyRequest(); } catch { /* silent */ }
    sessionActiveRef.current = false;
  }, []);

  const cancelWrite = useCallback(async () => {
    await _cleanup();
    setIsWriting(false);
  }, [_cleanup]);

  const reset = useCallback(() => {
    setSuccess(false);
    setError(null);
  }, []);

  // ── writeUrl: escribe una URL en el tag ──────────────────
  const writeUrl = useCallback(async (url) => {
    if (isWriting) return;
    if (!url?.trim()) {
      setError('Ingresa una URL válida.');
      return;
    }

    setIsWriting(true);
    setSuccess(false);
    setError(null);
    sessionActiveRef.current = true;

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Acerca la tarjeta NFC para escribir',
      });

      // Construir mensaje NDEF con URI record
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(url.trim())]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        setSuccess(true);
      } else {
        throw new Error('No se pudo codificar la URL.');
      }
    } catch (err) {
      console.warn('[NfcWriter] writeUrl error:', err?.message || err);
      const msg = err?.message || '';
      if (msg.includes('cancelled') || msg.includes('cancel') || msg.includes('UserCancel')) {
        setError('Escritura cancelada.');
      } else if (msg.includes('read-only') || msg.includes('readonly')) {
        setError('Esta tarjeta es de solo lectura.');
      } else if (msg.includes('capacity') || msg.includes('too large')) {
        setError('La URL es demasiado larga para esta tarjeta.');
      } else {
        setError(msg || 'Error al escribir en la tarjeta.');
      }
    } finally {
      await _cleanup();
      setIsWriting(false);
    }
  }, [isWriting, _cleanup]);

  // ── writeText: escribe texto plano en el tag ─────────────
  const writeText = useCallback(async (text) => {
    if (isWriting) return;
    if (!text?.trim()) {
      setError('Ingresa un texto válido.');
      return;
    }

    setIsWriting(true);
    setSuccess(false);
    setError(null);
    sessionActiveRef.current = true;

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Acerca la tarjeta NFC para escribir',
      });

      // Construir mensaje NDEF con Text record
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text.trim())]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        setSuccess(true);
      } else {
        throw new Error('No se pudo codificar el texto.');
      }
    } catch (err) {
      console.warn('[NfcWriter] writeText error:', err?.message || err);
      const msg = err?.message || '';
      if (msg.includes('cancelled') || msg.includes('cancel') || msg.includes('UserCancel')) {
        setError('Escritura cancelada.');
      } else if (msg.includes('read-only') || msg.includes('readonly')) {
        setError('Esta tarjeta es de solo lectura.');
      } else if (msg.includes('capacity') || msg.includes('too large')) {
        setError('El texto es demasiado largo para esta tarjeta.');
      } else {
        setError(msg || 'Error al escribir en la tarjeta.');
      }
    } finally {
      await _cleanup();
      setIsWriting(false);
    }
  }, [isWriting, _cleanup]);

  return {
    isSupported, isWriting, success, error,
    checkNfcSupport, writeUrl, writeText, cancelWrite, reset,
  };
};