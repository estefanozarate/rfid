import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RFontSize, rs } from '../utils/responsive';
import Icon from '../components/Icon';
import { loadWallet } from '../services/walletService';
import { getAllSellos } from '../db/sellosRepository';
import { getDocumentosValidados } from '../db/validacionesRepository';
import { countWhitelist } from '../db/whitelistRepository';

const InicioScreen = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [wallet,       setWallet]       = React.useState(null);
  const [sellosCnt,    setSellosCnt]    = React.useState(0);
  const [validCnt,     setValidCnt]     = React.useState(0);
  const [whitelistCnt, setWhitelistCnt] = React.useState(0);
  const [loading,      setLoading]      = React.useState(true);

  const loadData = useCallback(async () => {
    const w = await loadWallet();
    setWallet(w);
    setSellosCnt(getAllSellos().length);
    setValidCnt(getDocumentosValidados().length);
    setWhitelistCnt(countWhitelist());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const t = theme;

  if (loading) return (
    <style={{ flex:1, backgroundColor: t.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator color={t.accent} size="large" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: t.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header con logo */}
      <View style={[styles.header, { backgroundColor: t.bgSurface, borderBottomColor: t.bgBorder }]}>
        <Image
          source={require('../../assets/logot_crop.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
          <Icon name={isDark ? 'sun' : 'moon'} size={RFontSize.xl} color={t.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: rs(Spacing.md) }]}
        showsVerticalScrollIndicator={false}>

        {/* Wallet mini */}
        {wallet ? (
          <View style={[styles.walletBar, { backgroundColor: t.brand }]}>
            <View style={styles.walletDot}>
              <View style={[styles.dot, { backgroundColor: t.success }]} />
            </View>
            <Text style={[styles.walletAddr, { fontSize: RFontSize.xs }]} numberOfLines={1}>
              {wallet.address.slice(0,12)}...{wallet.address.slice(-8)}
            </Text>
            <View style={[styles.walletBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.walletBadgeTxt, { fontSize: RFontSize.xs - 1 }]}>
                {whitelistCnt} autorizados
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.noWalletBar, { backgroundColor: t.bgCard, borderColor: t.bgBorder }]}
            onPress={() => navigation.navigate('Main', { screen: 'WalletTab' })}
          >
            <Icon name="lockOpen" size={RFontSize.lg} color={t.accent} />
            <Text style={[styles.noWalletTxt, { color: t.accent, fontSize: RFontSize.sm }]}>
              Crear wallet para firmar documentos →
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Sellos',      value: sellosCnt,    color: t.accent   },
            { label: 'Validaciones', value: validCnt,    color: t.success  },
            { label: 'Firmantes',   value: whitelistCnt, color: t.rose     },
          ].map(({ label, value, color }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: t.bgCard, borderColor: t.bgBorder, flex: 1 }]}>
              <Text style={[styles.statValue, { color, fontSize: RFontSize.xxl }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: t.textMuted, fontSize: RFontSize.xs }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Acciones principales */}
        <Text style={[styles.sectionLabel, { color: t.textMuted, fontSize: RFontSize.xs }]}>
          ACCIONES
        </Text>

        {/* Sellar */}
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardPrimary, { backgroundColor: t.accent }]}
          onPress={() => navigation.navigate('NuevoSello')}
          activeOpacity={0.85}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Icon name="lock" size={RFontSize.xl} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: '#fff', fontSize: RFontSize.lg }]}>
              Sellar documento
            </Text>
            <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.75)', fontSize: RFontSize.sm }]}>
              Escanear QR y firmar en tag NFC
            </Text>
          </View>
          <Icon name="chevronRight" size={RFontSize.lg} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Validar */}
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: t.bgCard, borderColor: t.bgBorder, borderWidth: 1 }]}
          onPress={() => navigation.navigate('NuevaValidacion')}
          activeOpacity={0.85}
        >
          <View style={[styles.actionIconBox, { backgroundColor: t.accentGlow }]}>
            <Icon name="shield" size={RFontSize.xl} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: t.textPrimary, fontSize: RFontSize.lg }]}>
              Validar documento
            </Text>
            <Text style={[styles.actionSub, { color: t.textSecondary, fontSize: RFontSize.sm }]}>
              Leer QR y verificar firma en NFC
            </Text>
          </View>
          <Icon name="chevronRight" size={RFontSize.lg} color={t.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(Spacing.md), paddingTop: rs(Spacing.md), paddingBottom: rs(Spacing.sm), borderBottomWidth: 1, gap: rs(Spacing.sm) },
  logoBg:      {},
  logoImg:     { height: rs(42), width: rs(140) },
  appName:     { fontWeight: FontWeight.bold },
  appSub:      { letterSpacing: 0.3, marginTop: 1 },
  themeBtn:    { padding: rs(Spacing.sm) },
  content:     { gap: rs(Spacing.md), paddingTop: rs(Spacing.md), paddingBottom: rs(Spacing.xxl) },
  walletBar:   { borderRadius: Radius.md, paddingVertical: rs(Spacing.sm + 2), paddingHorizontal: rs(Spacing.md), flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.sm) },
  walletDot:   { flexDirection: 'row', alignItems: 'center' },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  walletAddr:  { flex: 1, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' },
  walletBadge: { borderRadius: Radius.full, paddingHorizontal: rs(8), paddingVertical: 2 },
  walletBadgeTxt: { color: '#fff', fontWeight: FontWeight.medium },
  noWalletBar: { borderRadius: Radius.md, padding: rs(Spacing.md), flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.sm), borderWidth: 1, borderStyle: 'dashed' },
  noWalletTxt: { fontWeight: FontWeight.medium },
  statsRow:    { flexDirection: 'row', gap: rs(Spacing.sm) },
  statCard:    { borderRadius: Radius.md, padding: rs(Spacing.md), alignItems: 'center', borderWidth: 1, gap: 2 },
  statValue:   { fontWeight: FontWeight.black },
  statLabel:   { letterSpacing: 0.3, textTransform: 'uppercase' },
  sectionLabel:{ fontWeight: FontWeight.bold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -rs(4) },
  actionCard:  { borderRadius: Radius.lg, padding: rs(Spacing.md), flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.md) },
  actionCardPrimary: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  actionIconBox: { width: rs(48), height: rs(48), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontWeight: FontWeight.bold },
  actionSub:   { marginTop: 2 },
});

export default InicioScreen;
