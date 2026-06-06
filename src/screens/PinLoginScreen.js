import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RFontSize, rs } from '../utils/responsive';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const PANEL_W   = Math.min(width, 420);
const PIN_LEN   = 6;
const BTN_SIZE  = rs(isTablet ? 80 : 68);
const DOT_SIZE  = rs(14);

// Verificar PIN descifando privKey y comparando el address derivado
const verifyPinByDecryption = async (pin) => {
  const svc = require('../services/walletService');
  // Intenta firmar un payload de prueba — si el PIN es incorrecto, el address no coincidirá
  try {
    const SecureStore = require('expo-secure-store');
    const { pbkdf2 }  = require('@noble/hashes/pbkdf2');
    const { sha256 }  = require('@noble/hashes/sha256');
    const secp        = require('@noble/secp256k1');
    const { keccak_256 } = require('@noble/hashes/sha3');

    const KEY_PRIVKEY_ENC  = 'nfc_wallet_privkey_enc';
    const KEY_PRIVKEY_SALT = 'nfc_wallet_privkey_salt';
    const KEY_ADDRESS      = 'nfc_wallet_address';

    const encHex   = await SecureStore.getItemAsync(KEY_PRIVKEY_ENC);
    const saltHex  = await SecureStore.getItemAsync(KEY_PRIVKEY_SALT);
    const address  = await SecureStore.getItemAsync(KEY_ADDRESS);

    if (!encHex || !saltHex || !address) return false;

    const fromHex = (h) => new Uint8Array(h.replace(/^0x/,'').match(/.{1,2}/g).map(v => parseInt(v,16)));
    const toHex   = (b) => Array.from(b).map(v => v.toString(16).padStart(2,'0')).join('');

    const pinBytes  = new TextEncoder().encode(pin);
    const saltBytes = fromHex(saltHex);
    const key       = pbkdf2(sha256, pinBytes, saltBytes, { c: 10000, dkLen: 32 });

    const encBytes     = fromHex(encHex);
    const privKeyBytes = new Uint8Array(encBytes.length);
    for (let i = 0; i < encBytes.length; i++) privKeyBytes[i] = encBytes[i] ^ key[i % key.length];

    if (!secp.utils.isValidPrivateKey(privKeyBytes)) return false;

    const pubKey    = secp.getPublicKey(privKeyBytes, false);
    const hash      = keccak_256(pubKey.slice(1));
    const derived   = '0x' + toHex(hash.slice(-20));

    return derived.toLowerCase() === address.toLowerCase();
  } catch (e) {
    console.warn('[PinLogin] verify error:', e.message);
    return false;
  }
};

// ── Botón numérico ────────────────────────────────────────
const PinBtn = ({ label, sub, onPress, theme, isDelete }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.8}>
      <Animated.View style={[styles.btn, {
        width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE/2,
        backgroundColor: theme.bgCard, borderColor: theme.bgBorder,
        transform: [{ scale }],
      }]}>
        {isDelete ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: rs(18), height: 2.5, backgroundColor: theme.textSecondary, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
            <View style={{ width: rs(18), height: 2.5, backgroundColor: theme.textSecondary, transform: [{ rotate: '-45deg' }] }} />
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.btnLabel, { color: theme.textPrimary, fontSize: RFontSize.xl + rs(2) }]}>{label}</Text>
            {sub ? <Text style={[styles.btnSub, { color: theme.textMuted, fontSize: rs(8) }]}>{sub}</Text> : null}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const PinLoginScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [pin,      setPin]      = useState('');
  const [errMsg,   setErrMsg]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => Animated.sequence([
    Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
  ]).start();

  // Layout aleatorio cada vez que se monta
  const KEYS = useMemo(() => {
    const digits = ['1','2','3','4','5','6','7','8','9','0'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    const d = digits.slice(0, 9);
    return [
      [d[0],'',d[1],'',d[2],''],
      [d[3],'',d[4],'',d[5],''],
      [d[6],'',d[7],'',d[8],''],
      [null,null,digits[9],'','delete',null],
    ];
  }, []);

  const handleDigit = async (d) => {
    if (loading || pin.length >= PIN_LEN) return;
    const next = pin + d;
    setPin(next);
    setErrMsg('');

    if (next.length === PIN_LEN) {
      setLoading(true);
      setTimeout(async () => {
        const ok = await verifyPinByDecryption(next);
        if (ok) {
          navigation.replace('Main');
        } else {
          shake();
          setErrMsg('PIN incorrecto. Inténtalo de nuevo.');
          setPin('');
        }
        setLoading(false);
      }, 150);
    }
  };

  return (
    <style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.container, { maxWidth: PANEL_W, alignSelf: 'center', width: '100%' }]}>

        {/* Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/logot_crop.png')}
            style={[styles.logoImg, { height: rs(isTablet ? 44 : 34), width: rs(isTablet ? 150 : 120) }]}
            resizeMode="contain"
          />
        </View>

        {/* Título */}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
            Ingresa tu PIN
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
            Tu wallet se desbloqueará automáticamente
          </Text>
        </View>

        {/* Puntos */}
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <View key={i} style={[styles.dot, {
              width:  DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE/2,
              borderWidth: 2,
              borderColor:     i < pin.length ? theme.accent : theme.bgBorder2,
              backgroundColor: i < pin.length ? theme.accent : 'transparent',
            }]} />
          ))}
        </Animated.View>

        {/* Error / loading */}
        {loading ? (
          <ActivityIndicator color={theme.accent} size="small" />
        ) : errMsg ? (
          <Text style={[styles.errMsg, { color: theme.error, fontSize: RFontSize.sm }]}>{errMsg}</Text>
        ) : (
          <View style={{ height: RFontSize.sm + rs(4) }} />
        )}

        {/* Teclado aleatorio */}
        <View style={styles.keyboard}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {[0,2,4].map(ci => {
                const key = row[ci];
                const sub = row[ci+1];
                if (key === null) return <View key={ci} style={{ width: BTN_SIZE, height: BTN_SIZE }} />;
                if (key === 'delete') return (
                  <PinBtn key="del" isDelete onPress={() => { setPin(p => p.slice(0,-1)); setErrMsg(''); }} theme={theme} />
                );
                return <PinBtn key={key} label={key} sub={sub} onPress={() => handleDigit(key)} theme={theme} />;
              })}
            </View>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(Spacing.lg), gap: rs(Spacing.lg) },
  logoRow:    { alignItems: 'center' },
  logoImg:    {},
  titleBlock: { alignItems: 'center', gap: rs(Spacing.xs) },
  title:      { fontWeight: FontWeight.bold },
  sub:        { textAlign: 'center' },
  dotsRow:    { flexDirection: 'row', gap: rs(Spacing.md), height: rs(36), alignItems: 'center' },
  dot:        {},
  errMsg:     { fontWeight: FontWeight.medium, textAlign: 'center' },
  keyboard:   { gap: rs(Spacing.md), alignItems: 'center' },
  keyRow:     { flexDirection: 'row', gap: rs(Spacing.lg) },
  btn:        { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnLabel:   { fontWeight: FontWeight.medium },
  btnSub:     { letterSpacing: 1.5 },
});

export default PinLoginScreen;
