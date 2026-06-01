/**
 * hooks/useNfcReader.js
 * ──────────────────────────────────────────────────────────
 * Hook personalizado que encapsula TODA la lógica de NFC.
 *
 * Flujo:
 *  1. checkNfcSupport()  → verifica si el HW soporta NFC.
 *  2. startScan()        → activa el listener nativo y espera un tag.
 *  3. cancelScan()       → cancela la sesión activa (cleanup).
 *
 * Tecnologías intentadas en orden de prioridad:
 *  - NfcTech.NfcA  (ISO 14443-3A — la mayoría de tags RFID/NFC)
 *  - NfcTech.NfcB  (ISO 14443-3B)
 *  - NfcTech.NfcV  (ISO 15693 — tags industriales de largo alcance)
 *  - NfcTech.IsoDep (ISO 14443-4 — smart cards)
 *  - NfcTech.Ndef  (tags con mensaje NDEF estándar)
 *
 * Retorna:
 *  { isSupported, isScanning, tagData, error, startScan, cancelScan, reset }
 */

import { useState, useCallback, useRef } from 'react';
import NfcManager, { NfcTech, NfcEvents } from 'react-native-nfc-manager';

// ─── Utilidades ────────────────────────────────────────────

/**
 * Convierte un array de bytes a string hexadecimal legible.
 * Ej: [0x04, 0xAB, 0xCD] → "04:AB:CD"
 */
const bytesToHex = (bytes) => {
  if (!bytes || !Array.isArray(bytes)) return 'N/A';
  return bytes
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(':');
};

/**
 * Convierte bytes NDEF a string UTF-8 cuando es posible.
 */
const bytesToUtf8 = (bytes) => {
  if (!bytes || !Array.isArray(bytes)) return null;
  try {
    return bytes
      .map((b) => String.fromCharCode(b))
      .join('')
      .replace(/[^\x20-\x7E]/g, '') // solo ASCII imprimible
      .trim() || null;
  } catch {
    return null;
  }
};

/**
 * Extrae registros NDEF del payload del tag.
 */
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

// ─── Tecnologías NFC en orden de intento ───────────────────
const TECHNOLOGIES_TO_TRY = [
  NfcTech.NfcA,
  NfcTech.NfcB,
  NfcTech.NfcV,
  NfcTech.IsoDep,
  NfcTech.Ndef,
];

// Mapa de nombre legible por tecnología
const TECH_LABELS = {
  [NfcTech.NfcA]:   'NFC-A (ISO 14443-3A)',
  [NfcTech.NfcB]:   'NFC-B (ISO 14443-3B)',
  [NfcTech.NfcV]:   'NFC-V (ISO 15693)',
  [NfcTech.IsoDep]: 'ISO-DEP (ISO 14443-4)',
  [NfcTech.Ndef]:   'NDEF',
};

// ─── Hook principal ────────────────────────────────────────

export const useNfcReader = () => {
  const [isSupported, setIsSupported]   = useState(null); // null = aún no verificado
  const [isScanning,  setIsScanning]    = useState(false);
  const [tagData,     setTagData]       = useState(null);
  const [error,       setError]         = useState(null);

  // Ref para saber si hay una sesión activa y poder cancelarla
  const sessionActiveRef = useRef(false);
  // Ref para recordar qué tecnología se conectó y poder cerrarla en finally
  const connectedTechRef = useRef(null);

  // ── checkNfcSupport ──────────────────────────────────────
  /**
   * Verifica soporte NFC en el dispositivo e inicializa NfcManager.
   * Debe llamarse UNA vez al montar la pantalla de lectura.
   */
  const checkNfcSupport = useCallback(async () => {
    try {
      const supported = await NfcManager.isSupported();
      setIsSupported(supported);

      if (supported) {
        // Inicializa el manager; es idempotente (seguro llamar múltiples veces)
        await NfcManager.start();
      }

      return supported;
    } catch (err) {
      console.warn('[NFC] checkNfcSupport error:', err);
      setIsSupported(false);
      return false;
    }
  }, []);

  // ── cancelScan ───────────────────────────────────────────
  /**
   * Cancela la sesión NFC activa.
   * Siempre seguro de llamar — no lanza si no hay sesión activa.
   */
  const cancelScan = useCallback(async () => {
    if (!sessionActiveRef.current) return;
    try {
      // Cerrar la conexión con la tecnología si estaba abierta
      if (connectedTechRef.current) {
        await NfcManager.close(connectedTechRef.current);
        connectedTechRef.current = null;
      }
    } catch { /* silent */ }
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignoramos errores de cancelación; el estado se limpia abajo
    } finally {
      sessionActiveRef.current = false;
      setIsScanning(false);
    }
  }, []);

  // ── reset ─────────────────────────────────────────────────
  /**
   * Resetea el estado para permitir un nuevo escaneo.
   */
  const reset = useCallback(() => {
    setTagData(null);
    setError(null);
  }, []);

  // ── startScan ────────────────────────────────────────────
  /**
   * Inicia la sesión NFC. Itera sobre las tecnologías disponibles
   * hasta encontrar una compatible con el tag acercado.
   *
   * En iOS: usa una sesión de sheet nativa automáticamente.
   * En Android: usa el foreground dispatch nativo.
   */
  const startScan = useCallback(async () => {
    // Guardias previas
    if (isScanning) return;
    if (isSupported === false) {
      setError('Este dispositivo no soporta NFC.');
      return;
    }

    setIsScanning(true);
    setTagData(null);
    setError(null);
    sessionActiveRef.current  = true;
    connectedTechRef.current  = null;

    let detectedTech = null;

    try {
      // Intentamos conectar con cada tecnología en orden
      for (const tech of TECHNOLOGIES_TO_TRY) {
        if (!sessionActiveRef.current) break; // cancelado por el usuario

        try {
          // requestTechnology bloquea hasta detectar un tag O hasta timeout/cancel
          await NfcManager.requestTechnology(tech, {
            alertMessage: 'Acerca el tag RFID al teléfono', // iOS sheet message
          });
          detectedTech = tech;
          break; // Tag encontrado con esta tecnología ✓
        } catch (techErr) {
          // Esta tecnología no fue compatible → intentamos la siguiente
          // Si el error es cancelación del usuario, lo propagamos
          if (techErr?.message?.includes('cancelled') ||
              techErr?.message?.includes('cancel')    ||
              techErr?.message?.includes('UserCancel')) {
            throw techErr;
          }
          // De lo contrario, continuamos con la siguiente tecnología
          continue;
        }
      }

      // Si no se detectó ninguna tecnología compatible
      if (!detectedTech) {
        throw new Error('Tag no reconocido. Asegúrate de que sea un tag NFC/RFID compatible.');
      }

      // ── Conectar al tag antes de leer (requerido en Android) ──
      try {
        await NfcManager.connect(detectedTech);
        connectedTechRef.current = detectedTech; // guardamos para el finally
      } catch (connectErr) {
        // En algunos tags connect() no es necesario; continuar de todos modos
        console.warn('[NFC] connect() warning:', connectErr?.message);
      }

      // ── Lectura del tag detectado ─────────────────────────
      const tag = await NfcManager.getTag();

      if (!tag) {
        throw new Error('No se pudo leer el tag. Intenta de nuevo.');
      }

      // ── Procesamiento de datos del tag ────────────────────
      const uid = tag.id
        ? bytesToHex(tag.id)
        : tag.nfcid
        ? bytesToHex(tag.nfcid)
        : 'No disponible';

      // Lectura adicional según tecnología (ATQA, SAK para NFC-A, etc.)
      let techSpecificData = {};

      if (detectedTech === NfcTech.NfcA) {
        techSpecificData = {
          atqa: tag.atqa ? bytesToHex(tag.atqa) : null,
          sak:  tag.sak  ? `0x${tag.sak.toString(16).toUpperCase()}` : null,
        };
      }

      if (detectedTech === NfcTech.NfcV) {
        techSpecificData = {
          dsfId:         tag.dsfId         ?? null,
          responseFlags: tag.responseFlags ?? null,
        };
      }

      // Parseo de registros NDEF si existen
      const ndefRecords = tag.ndefMessage
        ? parseNdefRecords(tag.ndefMessage)
        : [];

      // ── Construcción del objeto de resultado ──────────────
      const result = {
        uid,
        technology:      TECH_LABELS[detectedTech] || detectedTech,
        techRaw:         detectedTech,
        maxSize:         tag.maxSize         ?? null,
        isWritable:      tag.isWritable      ?? null,
        canMakeReadOnly: tag.canMakeReadOnly ?? null,
        ndefRecords,
        rawTag:          tag,
        ...techSpecificData,
        scannedAt: new Date().toISOString(),
      };

      setTagData(result);

    } catch (err) {
      console.warn('[NFC] startScan error:', err?.message || err);

      const msg = err?.message || '';

      if (
        msg.includes('cancelled') ||
        msg.includes('cancel')    ||
        msg.includes('UserCancel')
      ) {
        setError('Escaneo cancelado por el usuario.');
      } else {
        setError(msg || 'Error desconocido al leer el tag.');
      }
    } finally {
      // ── Cleanup SIEMPRE — orden: close() → cancelTechnologyRequest() ──
      // 1. Cerrar la conexión con el tag (evita IllegalStateException en re-escaneo)
      if (connectedTechRef.current) {
        try {
          await NfcManager.close(connectedTechRef.current);
        } catch { /* silent */ }
        connectedTechRef.current = null;
      }
      // 2. Cancelar la sesión de tecnología nativa
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch { /* silent */ }

      sessionActiveRef.current = false;
      setIsScanning(false);
    }
  }, [isScanning, isSupported]);

  return {
    isSupported,
    isScanning,
    tagData,
    error,
    checkNfcSupport,
    startScan,
    cancelScan,
    reset,
  };
};