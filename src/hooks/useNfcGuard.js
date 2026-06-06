/**
 * hooks/useNfcGuard.js
 * Mientras la app está en primer plano, captura el NFC para que
 * ningún otro app (ni el sistema) pueda leer tags.
 *
 * Android: registerTagEvent() pone la app en "reader mode" exclusivo.
 * iOS: no aplica (iOS no permite captura NFC en background de todos modos).
 *
 * El guard se SUSPENDE automáticamente durante operaciones activas
 * (sellar/validar) porque esas usan requestTechnology que necesita
 * el canal NFC libre. Por eso exponemos pause()/resume().
 */
import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import NfcManager from 'react-native-nfc-manager';

export const useNfcGuard = () => {
  const isGuarding = useRef(false);
  const isPaused   = useRef(false);

  const startGuard = useCallback(async () => {
    if (Platform.OS !== 'android') return;     // solo Android
    if (isGuarding.current || isPaused.current) return;
    try {
      const supported = await NfcManager.isSupported();
      if (!supported) return;
      const enabled = await NfcManager.isEnabled();
      if (!enabled) return;
      await NfcManager.start();
      // Capturar cualquier tag — al detectarlo no hacemos nada (lo "tragamos")
      await NfcManager.registerTagEvent();
      isGuarding.current = true;
      console.log('[NfcGuard] NFC capturado (modo exclusivo)');
    } catch (e) {
      console.warn('[NfcGuard] no se pudo capturar NFC:', e?.message);
    }
  }, []);

  const stopGuard = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (!isGuarding.current) return;
    try {
      await NfcManager.unregisterTagEvent();
      isGuarding.current = false;
      console.log('[NfcGuard] NFC liberado');
    } catch (e) {
      console.warn('[NfcGuard] error al liberar:', e?.message);
    }
  }, []);

  // Pausar el guard durante operaciones activas (sellar/validar)
  const pause = useCallback(async () => {
    isPaused.current = true;
    await stopGuard();
  }, [stopGuard]);

  const resume = useCallback(async () => {
    isPaused.current = false;
    if (AppState.currentState === 'active') {
      await startGuard();
    }
  }, [startGuard]);

  // Reaccionar al estado de la app: activa → capturar, background → liberar
  useEffect(() => {
    startGuard(); // al montar, si está activa

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        startGuard();
      } else {
        // background o inactive → liberar para no interferir con otras apps
        stopGuard();
      }
    });

    return () => {
      sub.remove();
      stopGuard();
    };
  }, [startGuard, stopGuard]);

  return { pause, resume };
};
