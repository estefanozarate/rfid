/**
 * components/NfcSheet.js
 * Sheet que sube desde abajo al leer/escribir NFC.
 * Muestra animación de ondas mientras espera el tag.
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

  // Slide up/down
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue:        0,
        useNativeDriver: true,
        tension:         60,
        friction:        10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue:         SCREEN_H,
        duration:        250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Ondas NFC animadas
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

  const isWrite   = mode === 'write';
  const isDone    = status === 'success' || status === 'error';
  const isSuccess = status === 'success';

  const statusColor = isSuccess ? Colors.success : status === 'error' ? Colors.error : Colors.accent;
  const statusIcon  = isSuccess ? '✓' : status === 'error' ? '✕' : isWrite ? '✎' : '↓';

  const defaultMsg = status === 'waiting'
    ? (isWrite ? 'Acerca el tag NFC para sellar' : 'Acerca el tag NFC para verificar')
    : isSuccess
    ? (isWrite ? 'Documento sellado correctamente' : 'Firma verificada')
    : 'Error al acceder al tag NFC';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle */}
          <View style={styles.handle} />

          {/* Título */}
          <Text style={styles.title}>
            {isWrite ? 'Sellar documento' : 'Verificar documento'}
          </Text>

          {/* Área visual NFC */}
          <View style={styles.nfcArea}>
            {status === 'waiting' ? (
              <View style={styles.waveContainer}>
                {/* Ondas animadas */}
                <Animated.View style={[styles.wave, styles.wave3, { opacity: wave3, transform: [{ scale: wave3 }] }]} />
                <Animated.View style={[styles.wave, styles.wave2, { opacity: wave2, transform: [{ scale: wave2 }] }]} />
                <Animated.View style={[styles.wave, styles.wave1, { opacity: wave1, transform: [{ scale: wave1 }] }]} />
                {/* Ícono central */}
                <View style={styles.nfcCenter}>
                  <Text style={styles.nfcIcon}>📡</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.resultCircle, { borderColor: statusColor }]}>
                <Text style={[styles.resultIcon, { color: statusColor }]}>{statusIcon}</Text>
              </View>
            )}
          </View>

          {/* Mensaje */}
          <Text style={styles.message}>{message || defaultMsg}</Text>
          <Text style={styles.subMessage}>
            {status === 'waiting'
              ? 'Mantén el tag quieto hasta que se complete'
              : isSuccess ? '¡Operación exitosa!' : 'Inténtalo de nuevo'}
          </Text>

          {/* Botón cancelar (solo en waiting) */}
          {status === 'waiting' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}

          {/* Botón cerrar (en done) */}
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 48,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.bgBorder,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // Área visual
  nfcArea: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  waveContainer: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  wave1: { width: WAVE_BASE,      height: WAVE_BASE },
  wave2: { width: WAVE_BASE * 1.5, height: WAVE_BASE * 1.5 },
  wave3: { width: WAVE_BASE * 2,   height: WAVE_BASE * 2 },
  nfcCenter: {
    width: 70, height: 70,
    borderRadius: 35,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcIcon: { fontSize: 28 },

  // Resultado
  resultCircle: {
    width: 100, height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  resultIcon: { fontSize: 40, fontWeight: FontWeight.black },

  // Texto
  message: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Botones
  cancelBtn: {
    marginTop: Spacing.sm,
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  successBtn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  successBtnText: {
    color: Colors.bg,
    fontWeight: FontWeight.bold,
  },
});

export default NfcSheet;
