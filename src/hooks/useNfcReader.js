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

// Tecnologías en orden de prioridad — se prueban de una en una
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

  const _cleanup = useCallback(async () => {
    if (connectedTechRef.current) {
      try { await NfcManager.close(); } catch { /* silent */ }
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

    let succeededTech = null;
    let tag = null;

    try {
      // Intentar cada tecnología de una en una.
      // requestTechnology recibe UN string (no array) — requerido en Android.
      // Cada intento espera a que el usuario acerque el tag.
      for (const tech of TECHNOLOGIES_TO_TRY) {
        if (!sessionActiveRef.current) break;

        try {
          await NfcManager.requestTechnology(tech, {
            alertMessage: 'Acerca el tag NFC al teléfono',
          });

          // Si llegamos aquí, el tag fue detectado con esta tech
          succeededTech = tech;
          connectedTechRef.current = tech;

          // Leer el tag
          tag = await NfcManager.getTag();

          // Salir del loop — tag leído con éxito
          break;

        } catch (techErr) {
          const msg = techErr?.message || '';

          // Si el usuario canceló — propagar el error y salir
          if (
            msg.includes('cancelled') ||
            msg.includes('cancel') ||
            msg.includes('UserCancel')
          ) {
            throw techErr;
          }

          // FIX: limpiar la sesión ANTES de intentar la siguiente tech
          // Esto evita el IllegalStateException en Android
          try { await NfcManager.cancelTechnologyRequest(); } catch { /* silent */ }

          // Tech no compatible con este tag — probar la siguiente
          continue;
        }
      }

      if (!tag) {
        throw new Error('No se pudo leer el tag. Intenta de nuevo.');
      }

      // Construir resultado
      const uid = tag.id
        ? bytesToHex(tag.id)
        : tag.nfcid
        ? bytesToHex(tag.nfcid)
        : 'No disponible';

      const techLabel = succeededTech
        ? (TECH_LABELS[succeededTech] || succeededTech)
        : 'Desconocido';

      let techSpecificData = {};
      if (succeededTech === NfcTech.NfcA) {
        techSpecificData = {
          atqa: tag.atqa ? bytesToHex(tag.atqa) : null,
          sak:  tag.sak  ? `0x${tag.sak.toString(16).toUpperCase()}` : null,
        };
      }
      if (succeededTech === NfcTech.NfcV) {
        techSpecificData = {
          dsfId:         tag.dsfId         ?? null,
          responseFlags: tag.responseFlags ?? null,
        };
      }

      const ndefRecords = tag.ndefMessage
        ? parseNdefRecords(tag.ndefMessage)
        : [];

      setTagData({
        uid,
        technology:      techLabel,
        techRaw:         succeededTech,
        maxSize:         tag.maxSize         ?? null,
        isWritable:      tag.isWritable      ?? null,
        canMakeReadOnly: tag.canMakeReadOnly ?? null,
        ndefRecords,
        rawTag:          tag,
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