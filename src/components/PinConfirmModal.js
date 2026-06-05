/**
 * components/PinConfirmModal.js
 * Modal de confirmación de PIN antes de firmar.
 * Sale desde abajo, misma estética que el teclado numérico de SetupPin.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions,
} from 'react-native';
import { Spacing, Radius, FontWeight } from '../theme';
import { RFontSize, rs } from '../utils/responsive';
import { verifyPin } from '../services/walletService';

const { width, height } = Dimensions.get('window');
const PIN_LEN  = 6;
const BTN_SIZE = rs(width >= 768 ? 72 : 60);
const DOT_SIZE = rs(12);

const PinBtn = ({ label, sub, onPress, theme, isDelete }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.8}>
      <Animated.View style={[styles.btn, {
        width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
        backgroundColor: theme.bgCard, borderColor: theme.bgBorder,
        transform: [{ scale }],
      }]}>
        {isDelete ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: rs(16), height: 2.5, backgroundColor: theme.textSecondary, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
            <View style={{ width: rs(16), height: 2.5, backgroundColor: theme.textSecondary, transform: [{ rotate: '-45deg' }] }} />
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.btnLabel, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>{label}</Text>
            {sub ? <Text style={[styles.btnSub, { color: theme.textMuted, fontSize: rs(8) }]}>{sub}</Text> : null}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const PinConfirmModal = ({ visible, onSuccess, onCancel, theme }) => {
  const [pin,    setPin]    = useState('');
  const [errMsg, setErrMsg] = useState('');
  const slideY   = useRef(new Animated.Value(height)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setPin(''); setErrMsg('');
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideY, { toValue: height, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = async (d) => {
    const next = pin + d;
    setPin(next);
    setErrMsg('');
    if (next.length === PIN_LEN) {
      setTimeout(async () => {
        const ok = await verifyPin(next);
        if (ok) {
          setPin('');
          onSuccess(next);
        } else {
          shake();
          setErrMsg('PIN incorrecto');
          setPin('');
        }
      }, 150);
    }
  };

  const KEYS = [
    ['1','','2','ABC','3','DEF'],
    ['4','GHI','5','JKL','6','MNO'],
    ['7','PQRS','8','TUV','9','WXYZ'],
    [null,null,'0','','delete',null],
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[styles.sheet, {
          backgroundColor: theme.bgSurface,
          transform: [{ translateY: slideY }],
        }]}>
          <View style={[styles.handle, { backgroundColor: theme.bgBorder }]} />
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
            Confirmar con PIN
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
            Ingresa tu PIN para firmar el documento
          </Text>

          {/* Puntos */}
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LEN }).map((_, i) => (
              <View key={i} style={[styles.dot, {
                borderColor:     i < pin.length ? theme.accent : theme.bgBorder2,
                backgroundColor: i < pin.length ? theme.accent : 'transparent',
              }]} />
            ))}
          </Animated.View>

          {errMsg ? (
            <Text style={[styles.errMsg, { color: theme.error, fontSize: RFontSize.sm }]}>
              {errMsg}
            </Text>
          ) : <View style={{ height: RFontSize.sm + rs(4) }} />}

          {/* Teclado */}
          <View style={styles.keyboard}>
            {KEYS.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {[0,2,4].map(ci => {
                  const key = row[ci];
                  const sub = row[ci+1];
                  if (key === null) return <View key={ci} style={{ width: BTN_SIZE, height: BTN_SIZE }} />;
                  if (key === 'delete') return (
                    <PinBtn key="del" isDelete onPress={() => setPin(p => p.slice(0,-1))} theme={theme} />
                  );
                  return <PinBtn key={key} label={key} sub={sub} onPress={() => handleDigit(key)} theme={theme} />;
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={[styles.cancelTxt, { color: theme.textMuted, fontSize: RFontSize.sm }]}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:    { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, alignItems: 'center', paddingBottom: rs(Spacing.xl), paddingTop: rs(Spacing.sm), gap: rs(Spacing.md), paddingHorizontal: rs(Spacing.lg) },
  handle:   { width: rs(40), height: rs(4), borderRadius: rs(2), marginBottom: rs(Spacing.xs) },
  title:    { fontWeight: FontWeight.bold },
  sub:      { textAlign: 'center' },
  dotsRow:  { flexDirection: 'row', gap: rs(Spacing.md), height: rs(32), alignItems: 'center' },
  dot:      { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE/2, borderWidth: 2 },
  errMsg:   { fontWeight: FontWeight.medium },
  keyboard: { gap: rs(Spacing.sm), alignItems: 'center' },
  keyRow:   { flexDirection: 'row', gap: rs(Spacing.md) },
  btn:      { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnLabel: { fontWeight: FontWeight.medium },
  btnSub:   { letterSpacing: 1.5 },
  cancelBtn:{ paddingVertical: rs(Spacing.sm), paddingHorizontal: rs(Spacing.xl) },
  cancelTxt:{ fontWeight: FontWeight.medium },
});

export default PinConfirmModal;
