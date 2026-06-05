import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

const NfcIcon = ({ color = Colors.accent, size = 48 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size*0.55, height: size*0.55, borderRadius:(size*0.55)/2, borderWidth:2, borderColor:color, opacity:0.9, position:'absolute' }} />
    <View style={{ width: size*0.75, height: size*0.75, borderRadius:(size*0.75)/2, borderWidth:1.5, borderColor:color, opacity:0.5, position:'absolute' }} />
    <View style={{ width: size*0.95, height: size*0.95, borderRadius:(size*0.95)/2, borderWidth:1, borderColor:color, opacity:0.25, position:'absolute' }} />
    <View style={{ width:8, height:8, borderRadius:4, backgroundColor:color }} />
  </View>
);

const FeatureChip = ({ label }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const WelcomeScreen = ({ navigation }) => {
  const logoAnim  = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim,  { toValue:1, useNativeDriver:true, tension:80, friction:8 }),
      Animated.spring(titleAnim, { toValue:1, useNativeDriver:true, tension:80, friction:8 }),
      Animated.spring(bodyAnim,  { toValue:1, useNativeDriver:true, tension:80, friction:8 }),
      Animated.spring(btnAnim,   { toValue:1, useNativeDriver:true, tension:80, friction:8 }),
    ]).start();
  }, []);

  const handlePressIn  = () => Animated.spring(btnScale, { toValue:0.96, useNativeDriver:true }).start();
  const handlePressOut = () => Animated.spring(btnScale, { toValue:1,    useNativeDriver:true }).start();

  const fadeUp = (anim) => ({
    opacity:   anim,
    transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <View style={styles.gridOverlay} pointerEvents="none">
        {[...Array(12)].map((_, i) => <View key={i} style={styles.gridDot} />)}
      </View>

      <View style={styles.container}>

        <Animated.View style={[styles.logoContainer, fadeUp(logoAnim)]}>
          <View style={styles.logoBg}>
            <NfcIcon size={52} color={Colors.accent} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>stamping.io</Text>
          </View>
        </Animated.View>

        <Animated.View style={fadeUp(titleAnim)}>
          <Text style={styles.title}>
            Bienvenido al{'\n'}
            <Text style={styles.titleAccent}>lector de RFID</Text>
          </Text>
        </Animated.View>

        <Animated.View style={[styles.bodyContainer, fadeUp(bodyAnim)]}>
          <Text style={styles.subtitle}>
            Escanea tags NFC/RFID en tiempo real usando la antena de tu dispositivo.
            Sin simulaciones — datos reales del hardware.
          </Text>
          <View style={styles.chipsRow}>
            <FeatureChip label="NFC-A / NFC-B" />
            <FeatureChip label="NFC-V (ISO 15693)" />
            <FeatureChip label="NDEF" />
          </View>
          <View style={styles.chipsRow}>
            <FeatureChip label="ISO-DEP" />
            <FeatureChip label="UID / Payload" />
          </View>
        </Animated.View>

        {/* Botón — ahora navega a Dashboard */}
        <Animated.View style={[styles.btnWrapper, fadeUp(btnAnim), { transform:[{ scale:btnScale }] }]}>
          <TouchableOpacity
            style={styles.btn}
            activeOpacity={1}
            onPress={async () => { const { hasWallet } = require('../services/walletService'); const ok = await hasWallet(); navigation.navigate(ok ? 'Main' : 'SetupWallet'); }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityLabel="Empezar"
            accessibilityRole="button"
          >
            <View style={styles.btnSheen} />
            <Text style={styles.btnText}>Empezar</Text>
            <Text style={styles.btnArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.footer, fadeUp(btnAnim)]}>
          <Text style={styles.footerText}>Requiere dispositivo con hardware NFC habilitado</Text>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:            { flex:1, backgroundColor:Colors.bg },
  gridOverlay:     { position:'absolute', top:0, left:0, right:0, bottom:0, flexWrap:'wrap', flexDirection:'row', padding:Spacing.xxl, gap:48, opacity:0.04 },
  gridDot:         { width:4, height:4, borderRadius:2, backgroundColor:Colors.accent, margin:24 },
  container:       { flex:1, paddingHorizontal:Spacing.xl, paddingTop:Spacing.xxl+Spacing.lg, paddingBottom:Spacing.xl, justifyContent:'center', gap:Spacing.lg },
  logoContainer:   { alignItems:'center', marginBottom:Spacing.sm },
  logoBg:          { width:100, height:100, borderRadius:28, backgroundColor:Colors.accentGlow, borderWidth:1, borderColor:'rgba(0,229,255,0.25)', alignItems:'center', justifyContent:'center' },
  badge:           { marginTop:Spacing.sm, paddingHorizontal:Spacing.md, paddingVertical:Spacing.xs, backgroundColor:Colors.bgSurface, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.bgBorder },
  badgeText:       { fontSize:FontSize.xs, fontWeight:FontWeight.bold, color:Colors.textSecondary, letterSpacing:2, textTransform:'uppercase' },
  title:           { fontSize:FontSize.hero, fontWeight:FontWeight.black, color:Colors.textPrimary, lineHeight:FontSize.hero*1.25, letterSpacing:-0.5 },
  titleAccent:     { color:Colors.accent },
  bodyContainer:   { gap:Spacing.md },
  subtitle:        { fontSize:FontSize.md, color:Colors.textSecondary, lineHeight:FontSize.md*1.6 },
  chipsRow:        { flexDirection:'row', flexWrap:'wrap', gap:Spacing.xs },
  chip:            { paddingHorizontal:Spacing.sm+2, paddingVertical:Spacing.xs, backgroundColor:Colors.bgSurface, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.bgBorder },
  chipText:        { fontSize:FontSize.xs, color:Colors.textSecondary, fontFamily:'monospace' },
  btnWrapper:      { marginTop:Spacing.sm },
  btn:             { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:Colors.accent, borderRadius:Radius.md, paddingVertical:Spacing.md+2, paddingHorizontal:Spacing.xl, gap:Spacing.sm, overflow:'hidden', shadowColor:Colors.accent, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12, elevation:8 },
  btnSheen:        { position:'absolute', top:0, left:0, right:0, height:'50%', backgroundColor:'rgba(255,255,255,0.08)', borderRadius:Radius.md },
  btnText:         { fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.bg, letterSpacing:0.3 },
  btnArrow:        { fontSize:FontSize.lg, color:Colors.bg, fontWeight:FontWeight.bold },
  footer:          { alignItems:'center', marginTop:Spacing.sm },
  footerText:      { fontSize:FontSize.xs, color:Colors.textMuted, textAlign:'center' },
});

export default WelcomeScreen;