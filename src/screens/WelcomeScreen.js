import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView, Image, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RFontSize, rs } from '../utils/responsive';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;

// ── Anillos NFC animados ──────────────────────────────────
const NfcRings = ({ color, size }) => {
  const pulse1 = useRef(new Animated.Value(0.9)).current;
  const pulse2 = useRef(new Animated.Value(0.6)).current;
  const pulse3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (anim, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
      ])
    );
    makeLoop(pulse1, 0).start();
    makeLoop(pulse2, 350).start();
    makeLoop(pulse3, 700).start();
  }, []);

  const s1 = size * 0.38;
  const s2 = size * 0.62;
  const s3 = size * 0.86;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: s3, height: s3, borderRadius: s3/2, borderWidth: 1.5, borderColor: color, opacity: pulse3 }} />
      <Animated.View style={{ position: 'absolute', width: s2, height: s2, borderRadius: s2/2, borderWidth: 1.5, borderColor: color, opacity: pulse2 }} />
      <Animated.View style={{ position: 'absolute', width: s1, height: s1, borderRadius: s1/2, borderWidth: 2,   borderColor: color, opacity: pulse1 }} />
      <View style={{ width: size*0.16, height: size*0.16, borderRadius: size*0.08, backgroundColor: color }} />
    </View>
  );
};

// ── Step chip ─────────────────────────────────────────────
const StepChip = ({ num, label, theme }) => (
  <View style={[styles.stepChip, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
    <View style={[styles.stepNum, { backgroundColor: theme.accentGlow }]}>
      <Text style={[styles.stepNumTxt, { color: theme.accent, fontSize: RFontSize.xs - 1 }]}>{num}</Text>
    </View>
    <Text style={[styles.stepLabel, { color: theme.textSecondary, fontSize: RFontSize.xs }]}>{label}</Text>
  </View>
);

// ── Pantalla ──────────────────────────────────────────────
const WelcomeScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  const logoAnim  = useRef(new Animated.Value(0)).current;
  const heroAnim  = useRef(new Animated.Value(0)).current;
  const textAnim  = useRef(new Animated.Value(0)).current;
  const stepsAnim = useRef(new Animated.Value(0)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(logoAnim,  { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.spring(heroAnim,  { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.spring(textAnim,  { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.spring(stepsAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.spring(btnAnim,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
    ]).start();
  }, []);

  const fadeUp = (anim) => ({
    opacity:   anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
  });

  const handlePressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  const handlePress = async () => {
    const svc  = require('../services/walletService');
    const hasW = await svc.hasWallet();
    const hasP = hasW ? await svc.hasPinSetup() : false;
    if (!hasW || !hasP) {
      navigation.navigate('SetupWallet');
    } else {
      navigation.navigate('PinLogin');
    }
  };

  const RING_SIZE = isTablet ? rs(140) : rs(110);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.container, { maxWidth: isTablet ? 480 : '100%', alignSelf: 'center', width: '100%' }]}>

        {/* Logo Fileserver */}
        <Animated.View style={[styles.logoRow, fadeUp(logoAnim)]}>
          <Image
            source={require('../../assets/logot_crop.png')}
            style={[styles.logoImg, { height: rs(isTablet ? 48 : 38), width: rs(isTablet ? 160 : 130) }]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Anillos NFC */}
        <Animated.View style={[styles.heroRow, fadeUp(heroAnim)]}>
          <NfcRings color={theme.accent} size={RING_SIZE} />
        </Animated.View>

        {/* Textos */}
        <Animated.View style={[styles.textBlock, fadeUp(textAnim)]}>
          <Text style={[styles.pre, { color: theme.accent, fontSize: RFontSize.xs }]}>
            CRIPTOGRAFÍA AVANZADA
          </Text>
          <Text style={[styles.title, { color: theme.textPrimary, fontSize: RFontSize.hero }]}>
            Bienvenido al{'\n'}
            <Text style={{ color: theme.accent }}>Sellador NFC</Text>
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
            Firma documentos con tu identidad ECDSA{'\n'}
            y séllalos en tags NFC — sin internet.
          </Text>
        </Animated.View>

        {/* 3 pasos */}
        <Animated.View style={[styles.stepsRow, fadeUp(stepsAnim)]}>
          <StepChip num="1" label="Escanear QR"     theme={theme} />
          <View style={[styles.stepLine, { backgroundColor: theme.bgBorder }]} />
          <StepChip num="2" label="Firmar wallet"   theme={theme} />
          <View style={[styles.stepLine, { backgroundColor: theme.bgBorder }]} />
          <StepChip num="3" label="Sellar NFC"      theme={theme} />
        </Animated.View>

        {/* Botón */}
        <Animated.View style={[fadeUp(btnAnim), { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.brand }]}
            activeOpacity={1}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Empezar</Text>
            <Text style={[styles.btnArrow, { fontSize: RFontSize.lg, color: theme.accent }]}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={fadeUp(btnAnim)}>
          <Text style={[styles.footer, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
            Requiere dispositivo con hardware NFC habilitado
          </Text>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  container:   { flex: 1, paddingHorizontal: rs(Spacing.xl), paddingTop: rs(Spacing.lg), paddingBottom: rs(Spacing.xl), justifyContent: 'center', gap: rs(Spacing.lg) },
  logoRow:     { alignItems: 'center' },
  logoImg:     {},
  heroRow:     { alignItems: 'center' },
  textBlock:   { alignItems: 'center', gap: rs(Spacing.sm) },
  pre:         { fontWeight: FontWeight.bold, letterSpacing: 2, textTransform: 'uppercase' },
  title:       { fontWeight: FontWeight.black, textAlign: 'center', letterSpacing: -0.5, lineHeight: undefined },
  sub:         { textAlign: 'center', lineHeight: rs(22) },
  stepsRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepChip:    { flexDirection: 'row', alignItems: 'center', gap: rs(5), paddingHorizontal: rs(8), paddingVertical: rs(5), borderRadius: Radius.full, borderWidth: 1 },
  stepNum:     { width: rs(16), height: rs(16), borderRadius: rs(8), alignItems: 'center', justifyContent: 'center' },
  stepNumTxt:  { fontWeight: FontWeight.black },
  stepLabel:   { fontWeight: FontWeight.medium },
  stepLine:    { flex: 1, height: 1.5, maxWidth: rs(16) },
  btn:         { borderRadius: Radius.lg, paddingVertical: rs(Spacing.md + 2), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.sm) },
  btnTxt:      { fontWeight: FontWeight.bold, color: '#ffffff' },
  btnArrow:    { fontWeight: FontWeight.bold },
  footer:      { textAlign: 'center' },
});

export default WelcomeScreen;
