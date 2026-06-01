/**
 * components/ScanRing.js
 * ──────────────────────────────────────────────────────────
 * Anillo animado que pulsa mientras se busca un tag NFC.
 * Usa Animated API nativo para máxima performance sin Reanimated.
 *
 * Props:
 *  active   {boolean} — Si true, la animación corre.
 *  size     {number}  — Diámetro del anillo principal (default 160).
 *  color    {string}  — Color del acento (default Colors.accent).
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../theme';

const ScanRing = ({ active = false, size = 160, color = Colors.accent }) => {
  // Animaciones: escala y opacidad para dos anillos concéntricos
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.8)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;
  const pulseAnim    = useRef(null);

  useEffect(() => {
    if (active) {
      // Resetear valores al inicio
      ring1Scale.setValue(1);
      ring1Opacity.setValue(0.8);
      ring2Scale.setValue(1);
      ring2Opacity.setValue(0.5);

      // Anillo 1: pulso más lento
      const loop1 = Animated.loop(
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );

      // Anillo 2: pulso más rápido, desfasado
      const loop2 = Animated.loop(
        Animated.sequence([
          Animated.delay(400),
          Animated.parallel([
            Animated.timing(ring2Scale, {
              toValue: 1.8,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

      loop1.start();
      loop2.start();
      pulseAnim.current = { loop1, loop2 };
    } else {
      // Detener y resetear
      pulseAnim.current?.loop1?.stop();
      pulseAnim.current?.loop2?.stop();
      ring1Scale.setValue(1);
      ring1Opacity.setValue(0);
      ring2Scale.setValue(1);
      ring2Opacity.setValue(0);
    }

    return () => {
      pulseAnim.current?.loop1?.stop();
      pulseAnim.current?.loop2?.stop();
    };
  }, [active]);

  const ringStyle = {
    width:        size,
    height:       size,
    borderRadius: size / 2,
    borderWidth:  1.5,
    borderColor:  color,
    position:     'absolute',
  };

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {/* Anillo pulsante 1 */}
      <Animated.View
        style={[
          ringStyle,
          {
            opacity:   ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      {/* Anillo pulsante 2 (desfasado) */}
      <Animated.View
        style={[
          ringStyle,
          {
            opacity:   ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      {/* Círculo central estático */}
      <View
        style={[
          ringStyle,
          {
            backgroundColor: active
              ? `rgba(0, 229, 255, 0.06)`
              : 'transparent',
            borderColor: active ? color : Colors.bgBorder,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
  },
});

export default ScanRing;
