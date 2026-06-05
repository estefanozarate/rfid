/**
 * hooks/useNfcWriter.js
 * Escribe texto NDEF en un tag NFC.
 * Maneja start(), soporte y errores explícitamente.
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
      // 1. Verificar soporte
      const supported = await NfcManager.isSupported();
      if (!supported) {
        throw new Error('Este dispositivo no tiene hardware NFC.');
      }

      // 2. Verificar que NFC esté habilitado en ajustes del sistema
      const enabled = await NfcManager.isEnabled();
      if (!enabled) {
        throw new Error('El NFC está desactivado. Actívalo en Ajustes → Conexiones → NFC.');
      }

      // 3. Inicializar (seguro llamar múltiples veces)
      await NfcManager.start();

      // 4. Solicitar tecnología NDEF
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // 5. Leer tag para obtener UID
      const tag = await NfcManager.getTag();
      console.log('[NFC] Tag detectado:', JSON.stringify(tag));

      const uid = tag?.id
        ? Array.from(tag.id).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
        : 'unknown';
      setNfcUid(uid);

      // 6. Verificar que el tag soporte escritura
      const ndefStatus = await NfcManager.ndefHandler.getNdefStatus();
      console.log('[NFC] NDEF status:', JSON.stringify(ndefStatus));

      if (ndefStatus.status === 3) { // ReadOnly
        throw new Error('Este tag NFC es de solo lectura y no se puede escribir.');
      }

      // 7. Codificar y escribir
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      console.log('[NFC] Escribiendo', bytes.length, 'bytes...');

      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      console.log('[NFC] Escritura exitosa');

      setSuccess(true);
      return { success: true, uid };

    } catch (err) {
      const msg = err?.message || String(err) || 'Error desconocido al escribir el tag';
      console.warn('[NFC] writeTag error:', msg);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch (e) {
        console.warn('[NFC] cancelTechnologyRequest:', e?.message);
      }
      setIsWriting(false);
    }
  }, []);

  return { isWriting, error, success, nfcUid, writeTag, reset };
};
