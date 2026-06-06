/**
 * components/NfcSheet.js
 * Sheet que sube desde abajo al leer/escribir NFC.
 *
 * Estados:
 *   waiting  → ondas expandiéndose, esperando el tag
 *   reading  → tag detectado: ondas colapsan + pulso, "procesando"
 *              (llena el hueco entre la vibración y el resultado)
 *   success  → círculo crece con pop + check ✓
 *   error    → círculo con ✕
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Easing, Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

const NfcSheet = ({ visible, mode = 'write', status = 'waiting', onCancel, message }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const wave1     = useRef(new Animated.Value(0.3)).current;
  const wave2     = useRef(new Animated.Value(0.3)).current;
  const wave3     = useRef(new Animated.Value(0.3)).current;
  const pulse     = useRef(new Animated.Value(1)).current;   // pulso en 'reading'
  const resultScale = useRef(new Animated.Value(0)).current; // pop del resultado
  const spinRot   = useRef(new Animated.Value(0)).current;   // giro del anillo 'reading'

  // Slide up/down
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 60, friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H, duration: 250, useNativeDriver: true,
      }).start();
      // resetear para la próxima apertura
      resultScale.setValue(0);
    }
  }, [visible]);

  // Ondas NFC mientras espera (waiting)
  useEffect(() => {
    if (!visible || status !== 'waiting') return;

    const makeWave = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 600, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
        ])
      );

    const a1 = makeWave(wave1, 0);
    const a2 = makeWave(wave2, 300);
    const a3 = makeWave(wave3, 600);
    a1.start(); a2.start(); a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [visible, status]);

  // Pulso + giro mientras procesa (reading)
  useEffect(() => {
    if (status !== 'reading') return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(spinRot, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    pulseLoop.start(); spinLoop.start();

    return () => { pulseLoop.stop(); spinLoop.stop(); spinRot.setValue(0); };
  }, [status]);

  // Pop del resultado (success/error)
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      resultScale.setValue(0);
      Animated.spring(resultScale, {
        toValue: 1, useNativeDriver: true, tension: 120, friction: 7,
      }).start();
    }
  }, [status]);

  const isWrite   = mode === 'write';
  const isReading = status === 'reading';
  const isDone    = status === 'success' || status === 'error';
  const isSuccess = status === 'success';

  const statusColor = isSuccess ? Colors.success : status === 'error' ? Colors.error : Colors.accent;
  const statusIcon  = isSuccess ? '✓' : status === 'error' ? '✕' : isWrite ? '✎' : '↓';

  const spin = spinRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const titleText = isWrite ? 'Sellar documento' : 'Verificar documento';

  const messageText = message || (
    status === 'waiting'
      ? (isWrite ? 'Acerca el tag NFC para sellar' : 'Acerca el tag NFC para verificar')
      : isReading
      ? 'Tag detectado, procesando...'
      : isSuccess
      ? (isWrite ? 'Documento sellado correctamente' : 'Firma verificada')
      : 'Error al acceder al tag NFC'
  );

  const subText =
    status === 'waiting'  ? 'Mantén el tag quieto hasta que se complete' :
    isReading             ? 'No retires el tag todavía' :
    isSuccess             ? '¡Operación exitosa!' :
                            'Inténtalo de nuevo';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          <View style={styles.handle} />
          <Text style={styles.title}>{titleText}</Text>

          {/* Área visual NFC */}
          <View style={styles.nfcArea}>
            {status === 'waiting' && (
              <View style={styles.waveContainer}>
                <Animated.View style={[styles.wave, styles.wave3, { opacity: wave3, transform: [{ scale: wave3 }] }]} />
                <Animated.View style={[styles.wave, styles.wave2, { opacity: wave2, transform: [{ scale: wave2 }] }]} />
                <Animated.View style={[styles.wave, styles.wave1, { opacity: wave1, transform: [{ scale: wave1 }] }]} />
                <View style={styles.nfcCenter}>
                  <Text style={styles.nfcIcon}>📡</Text>
                </View>
              </View>
            )}

            {isReading && (
              <View style={styles.waveContainer}>
                {/* Anillo giratorio alrededor */}
                <Animated.View style={[styles.spinRing, { transform: [{ rotate: spin }] }]} />
                {/* Centro pulsante con check tenue */}
                <Animated.View style={[styles.readingCenter, { transform: [{ scale: pulse }] }]}>
                  <Text style={styles.readingIcon}>✓</Text>
                </Animated.View>
              </View>
            )}

            {isDone && (
              <Animated.View style={[
                styles.resultCircle,
                { borderColor: statusColor, transform: [{ scale: resultScale }] },
              ]}>
                <Text style={[styles.resultIcon, { color: statusColor }]}>{statusIcon}</Text>
              </Animated.View>
            )}
          </View>

          <Text style={styles.message}>{messageText}</Text>
          <Text style={styles.subMessage}>{subText}</Text>

          {/* Cancelar — solo mientras espera el tag */}
          {status === 'waiting' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}

          {/* En reading NO hay botón — está procesando, no debe interrumpirse */}

          {/* Cerrar/Continuar — al terminar */}
          {isDone && (
            <TouchableOpacity style={[styles.cancelBtn, isSuccess && styles.successBtn]} onPress={onCancel}>
              <Text style={[styles.cancelText, isSuccess && styles.successBtnText]}>
                {isSuccess ? 'Continuar' : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
};

const WAVE_BASE = 90;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl, paddingBottom: 48, paddingTop: Spacing.md,
    alignItems: 'center', gap: Spacing.md,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.bgBorder, borderRadius: 2, marginBottom: Spacing.sm },
  title:  { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },

  nfcArea: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.md },
  waveContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative' },

  wave: { position: 'absolute', borderRadius: 999, borderWidth: 2, borderColor: Colors.accent },
  wave1: { width: WAVE_BASE,       height: WAVE_BASE },
  wave2: { width: WAVE_BASE * 1.5, height: WAVE_BASE * 1.5 },
  wave3: { width: WAVE_BASE * 2,   height: WAVE_BASE * 2 },
  nfcCenter: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  nfcIcon: { fontSize: 28 },

  // Estado reading
  spinRing: {
    position: 'absolute',
    width: WAVE_BASE * 1.6, height: WAVE_BASE * 1.6,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.accent,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  readingCenter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accentGlow,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  readingIcon: { fontSize: 34, color: Colors.accent, fontWeight: FontWeight.black },

  // Resultado
  resultCircle: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard,
  },
  resultIcon: { fontSize: 40, fontWeight: FontWeight.black },

  message:    { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'center' },
  subMessage: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  cancelBtn: {
    marginTop: Spacing.sm, width: '100%', paddingVertical: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.bgBorder, alignItems: 'center',
  },
  cancelText:     { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  successBtn:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  successBtnText: { color: Colors.bg, fontWeight: FontWeight.bold },
});

export default NfcSheet;
