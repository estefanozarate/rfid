import { useState, useCallback, useRef } from 'react';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

const bytesToHex = (bytes) => {
  if (!bytes || !Array.isArray(bytes)) return 'N/A';
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(':');
};

const bytesToUtf8 = (bytes) => {
  if (!bytes || !Array.isArray(bytes)) return null;
  try {
    return bytes.map((b) => String.fromCharCode(b)).join('').replace(/[^\x20-\x7E]/g, '').trim() || null;
  } catch { return null; }
};

const parseNdefRecords = (ndefMessage) => {
  if (!ndefMessage || !Array.isArray(ndefMessage)) return [];
  return ndefMessage.map((record, idx) => ({
    index:   idx,
    tnf:     record.tnf,
    type:    bytesToHex(record.type),
    id:      bytesToHex(record.id),
    payload: bytesToHex(record.payload),
    text:    bytesToUtf8(record.payload),
  }));
};

const TECHNOLOGIES_TO_TRY = [
  NfcTech.NfcA,
  NfcTech.NfcB,
  NfcTech.NfcV,
  NfcTech.IsoDep,
  NfcTech.Ndef,
];

const TECH_LABELS = {
  [NfcTech.NfcA]:   'NFC-A (ISO 14443-3A)',
  [NfcTech.NfcB]:   'NFC-B (ISO 14443-3B)',
  [NfcTech.NfcV]:   'NFC-V (ISO 15693)',
  [NfcTech.IsoDep]: 'ISO-DEP (ISO 14443-4)',
  [NfcTech.Ndef]:   'NDEF',
};

export const useNfcReader = () => {
  const [isSupported, setIsSupported] = useState(null);
  const [isScanning,  setIsScanning]  = useState(false);
  const [tagData,     setTagData]     = useState(null);
  const [error,       setError]       = useState(null);

  const sessionActiveRef = useRef(false);
  const connectedTechRef = useRef(null);

  const checkNfcSupport = useCallback(async () => {
    try {
      const supported = await NfcManager.isSupported();
      setIsSupported(supported);
      if (supported) await NfcManager.start();
      return supported;
    } catch (err) {
      console.warn('[NFC] checkNfcSupport error:', err);
      setIsSupported(false);
      return false;
    }
  }, []);

  // Limpieza centralizada — siempre segura de llamar
  const _cleanup = useCallback(async () => {
    if (connectedTechRef.current) {
      try { await NfcManager.close(connectedTechRef.current); } catch { /* silent */ }
      connectedTechRef.current = null;
    }
    try { await NfcManager.cancelTechnologyRequest(); } catch { /* silent */ }
  }, []);

  const cancelScan = useCallback(async () => {
    if (!sessionActiveRef.current) return;
    await _cleanup();
    sessionActiveRef.current = false;
    setIsScanning(false);
  }, [_cleanup]);

  const reset = useCallback(() => {
    setTagData(null);
    setError(null);
  }, []);

  const startScan = useCallback(async () => {
    if (isScanning) return;
    if (isSupported === false) {
      setError('Este dispositivo no soporta NFC.');
      return;
    }

    setIsScanning(true);
    setTagData(null);
    setError(null);
    sessionActiveRef.current = true;
    connectedTechRef.current = null;

    try {
      // FIX: pasar el array completo de tecnologías en lugar de iterar manualmente.
      // La librería selecciona la tecnología compatible automáticamente,
      // evitando las excepciones intermedias que causaban el crash en Android.
      await NfcManager.requestTechnology(TECHNOLOGIES_TO_TRY, {
        alertMessage: 'Acerca el tag RFID al teléfono',
      });

      // Primera lectura del tag (antes de connect)
      const tag = await NfcManager.getTag();
      if (!tag) throw new Error('No se pudo leer el tag. Intenta de nuevo.');

      // Conectar con la primera tecnología que acepte el tag
      for (const tech of TECHNOLOGIES_TO_TRY) {
        try {
          await NfcManager.connect(tech);
          connectedTechRef.current = tech;
          break;
        } catch { /* probar la siguiente */ }
      }

      // Segunda lectura tras connect — datos más completos
      const fullTag = await NfcManager.getTag();
      const finalTag = fullTag || tag;

      // Construir UID
      const uid = finalTag.id
        ? bytesToHex(finalTag.id)
        : finalTag.nfcid
        ? bytesToHex(finalTag.nfcid)
        : 'No disponible';

      const detectedTechLabel = connectedTechRef.current
        ? (TECH_LABELS[connectedTechRef.current] || connectedTechRef.current)
        : 'Desconocido';

      let techSpecificData = {};
      if (connectedTechRef.current === NfcTech.NfcA) {
        techSpecificData = {
          atqa: finalTag.atqa ? bytesToHex(finalTag.atqa) : null,
          sak:  finalTag.sak  ? `0x${finalTag.sak.toString(16).toUpperCase()}` : null,
        };
      }
      if (connectedTechRef.current === NfcTech.NfcV) {
        techSpecificData = {
          dsfId:         finalTag.dsfId         ?? null,
          responseFlags: finalTag.responseFlags ?? null,
        };
      }

      const ndefRecords = finalTag.ndefMessage
        ? parseNdefRecords(finalTag.ndefMessage)
        : [];

      setTagData({
        uid,
        technology:      detectedTechLabel,
        techRaw:         connectedTechRef.current,
        maxSize:         finalTag.maxSize         ?? null,
        isWritable:      finalTag.isWritable      ?? null,
        canMakeReadOnly: finalTag.canMakeReadOnly ?? null,
        ndefRecords,
        rawTag:          finalTag,
        ...techSpecificData,
        scannedAt: new Date().toISOString(),
      });

    } catch (err) {
      console.warn('[NFC] startScan error:', err?.message || err);
      const msg = err?.message || '';
      if (msg.includes('cancelled') || msg.includes('cancel') || msg.includes('UserCancel')) {
        setError('Escaneo cancelado por el usuario.');
      } else {
        setError(msg || 'Error desconocido al leer el tag.');
      }
    } finally {
      await _cleanup();
      sessionActiveRef.current = false;
      setIsScanning(false);
    }
  }, [isScanning, isSupported, _cleanup]);

  return { isSupported, isScanning, tagData, error, checkNfcSupport, startScan, cancelScan, reset };
};