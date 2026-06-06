/**
 * screens/SetupPinScreen.js
 * Configuración de PIN de 6 dígitos al primer ingreso.
 * Diseño estilo wallet (Yape/Plin) — panel numérico, responsive, max-width en tablet.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RFontSize, rs } from '../utils/responsive';
import { setupPin, registerWalletOnServer, fetchWhitelist } from '../services/walletService';
import { syncWhitelist } from '../db/whitelistRepository';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const PANEL_W   = Math.min(width, 420);
const PIN_LEN   = 6;

const DOT_SIZE  = rs(14);
const BTN_SIZE  = rs(isTablet ? 80 : 68);

// ── Punto del PIN ─────────────────────────────────────────
const PinDot = ({ filled, shaking, theme }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (filled) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [filled]);

  return (
    <Animated.View style={[
      styles.dot,
      {
        width:  DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        borderWidth: 2,
        borderColor: filled ? theme.accent : theme.bgBorder2,
        backgroundColor: filled ? theme.accent : 'transparent',
        transform: [{ scale }],
      }
    ]} />
  );
};

// ── Botón del teclado ─────────────────────────────────────
const PinBtn = ({ label, sub, onPress, theme, isDelete, isAction }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[
        styles.pinBtn,
        {
          width:  BTN_SIZE,
          height: BTN_SIZE,
          borderRadius: BTN_SIZE / 2,
          backgroundColor: isAction ? 'transparent' : theme.bgCard,
          borderWidth: isAction ? 0 : 1,
          borderColor: theme.bgBorder,
          transform: [{ scale }],
        }
      ]}>
        {isDelete ? (
          // Ícono borrar
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <View style={{ width: rs(16), height: 2.5, backgroundColor: theme.textSecondary, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
              <View style={{ width: rs(16), height: 2.5, backgroundColor: theme.textSecondary, transform: [{ rotate: '-45deg' }] }} />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.pinBtnLabel, { color: isAction ? theme.accent : theme.textPrimary, fontSize: RFontSize.xl + rs(2) }]}>
              {label}
            </Text>
            {sub ? (
              <Text style={[styles.pinBtnSub, { color: theme.textMuted, fontSize: rs(8) }]}>
                {sub}
              </Text>
            ) : null}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Pantalla ──────────────────────────────────────────────
const SetupPinScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const [stage,   setStage]   = useState('create');
  const [progress, setProgress] = useState('');  // create | confirm | syncing | done | error
  const [pin,     setPin]     = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [errMsg,  setErrMsg]  = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const label     = route?.params?.label || 'Mi Wallet';

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (d) => {
    if (pin.length >= PIN_LEN) return;
    const next = pin + d;
    setPin(next);
    setErrMsg('');
    if (next.length === PIN_LEN) {
      setTimeout(() => handleComplete(next), 200);
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleComplete = async (completed) => {
    if (stage === 'create') {
      setFirstPin(completed);
      setPin('');
      setStage('confirm');
      return;
    }

    if (stage === 'confirm') {
      if (completed !== firstPin) {
        shake();
        setErrMsg('Los PINs no coinciden. Intenta de nuevo.');
        setPin('');
        setStage('create');
        setFirstPin('');
        return;
      }

      // PIN correcto — cifrar wallet y sincronizar
      setStage('syncing');
      setProgress('Cifrando wallet...');
      try {
        await setupPin(completed);

        setProgress('Registrando en servidor...');
        try {
          await registerWalletOnServer(label);
        } catch (e) {
          console.warn('[SetupPin] registro falló:', e.message);
        }

        setProgress('Descargando lista blanca...');
        try {
          const wallets = await fetchWhitelist();
          syncWhitelist(wallets);
        } catch (e) {
          console.warn('[SetupPin] sync falló:', e.message);
        }

        setProgress('');
        setStage('done');
        setTimeout(() => navigation.replace('Main'), 1200);
      } catch (e) {
        setErrMsg(e.message);
        setStage('error');
      }
    }
  };

  const titles = {
    create:  { title: 'Crea tu PIN',       sub: `Elige ${PIN_LEN} dígitos para proteger tu wallet` },
    confirm: { title: 'Confirma tu PIN',   sub: 'Ingresa el mismo PIN para verificar' },
    syncing: { title: 'Configurando...',   sub: progress || 'Preparando tu wallet...' },
    done:    { title: '¡Listo!',           sub: 'Tu wallet está protegida' },
    error:   { title: 'Error',             sub: errMsg },
  };

  const current = titles[stage] || titles.create;

  // Generar layout aleatorio cada vez que se muestra el teclado
  const KEYS = useMemo(() => {
    const digits = ['1','2','3','4','5','6','7','8','9','0'];
    // Fisher-Yates shuffle
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    // Organizar en filas de 3, el ultimo row tiene hueco-0-delete
    const d = digits.slice(0, 9); // primeros 9 en grilla 3x3
    const last = digits[9];       // el 0 va abajo al centro
    return [
      [d[0],'',d[1],'',d[2],''],
      [d[3],'',d[4],'',d[5],''],
      [d[6],'',d[7],'',d[8],''],
      [null,null,last,'','delete',null],
    ];
  }, [stage]); // regenerar al cambiar de etapa

  return (
    <style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.container, { maxWidth: PANEL_W, alignSelf: 'center', width: '100%' }]}>

        {/* Indicador de etapa */}
        <View style={styles.stageRow}>
          {['create','confirm'].map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.stageDot, {
                backgroundColor: stage === s || (s === 'create' && stage === 'confirm') || stage === 'done' || stage === 'syncing'
                  ? theme.accent : theme.bgBorder2,
              }]}>
                <Text style={[styles.stageDotTxt, { color: '#fff', fontSize: RFontSize.xs - 1 }]}>
                  {i + 1}
                </Text>
              </View>
              {i === 0 && (
                <View style={[styles.stageLine, { backgroundColor: stage === 'confirm' || stage === 'done' || stage === 'syncing' ? theme.accent : theme.bgBorder2 }]} />
              )}
            </View>
          ))}
        </View>

        {/* Título */}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: RFontSize.xxl }]}>
            {current.title}
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
            {current.sub}
          </Text>
        </View>

        {/* Puntos del PIN */}
        {(stage === 'create' || stage === 'confirm') && (
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LEN }).map((_, i) => (
              <PinDot key={i} filled={i < pin.length} theme={theme} />
            ))}
          </Animated.View>
        )}

        {/* Estado done */}
        {stage === 'done' && (
          <View style={[styles.doneCircle, { borderColor: theme.success, backgroundColor: theme.successGlow }]}>
            <View style={[styles.checkMark, { borderColor: theme.success }]} />
          </View>
        )}

        {/* Teclado numérico */}
        {(stage === 'create' || stage === 'confirm') && (
          <View style={styles.keyboard}>
            {KEYS.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {[0,2,4].map(ci => {
                  const key = row[ci];
                  const sub = row[ci+1];
                  if (key === null) return <View key={ci} style={{ width: BTN_SIZE, height: BTN_SIZE }} />;
                  if (key === 'delete') return (
                    <PinBtn key="del" isDelete onPress={handleDelete} theme={theme} />
                  );
                  return (
                    <PinBtn
                      key={key}
                      label={key}
                      sub={sub}
                      onPress={() => handleDigit(key)}
                      theme={theme}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Syncing */}
        {stage === 'syncing' && (
          <View style={styles.syncingRow}>
            <ActivityIndicator size={"large"} color={theme.accent} />
          </View>
        )}

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(Spacing.lg), gap: rs(Spacing.xl) },
  stageRow:   { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stageDot:   { width: rs(28), height: rs(28), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  stageDotTxt:{ fontWeight: FontWeight.bold },
  stageLine:  { width: rs(60), height: rs(2), borderRadius: 1 },
  titleBlock: { alignItems: 'center', gap: rs(Spacing.xs) },
  title:      { fontWeight: FontWeight.black, textAlign: 'center' },
  sub:        { textAlign: 'center', lineHeight: rs(20) },
  dotsRow:    { flexDirection: 'row', gap: rs(Spacing.md), alignItems: 'center', height: rs(40) },
  dot:        {},
  keyboard:   { gap: rs(Spacing.md), alignItems: 'center' },
  keyRow:     { flexDirection: 'row', gap: rs(Spacing.lg) },
  pinBtn:     { alignItems: 'center', justifyContent: 'center' },
  pinBtnLabel:{ fontWeight: FontWeight.medium },
  pinBtnSub:  { letterSpacing: 1.5, marginTop: rs(1) },
  doneCircle: { width: rs(80), height: rs(80), borderRadius: rs(40), borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark:  { width: rs(24), height: rs(14), borderLeftWidth: 2.5, borderBottomWidth: 2.5, transform: [{ rotate: '-45deg' }], marginTop: rs(4) },
  syncingRow: { alignItems: 'center', justifyContent: 'center', height: rs(80) },
  syncSpinner:{ width: rs(44), height: rs(44), borderRadius: rs(22), borderWidth: 3 },
});

export default SetupPinScreen;
