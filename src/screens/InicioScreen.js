/**
 * screens/InicioScreen.js
 * Dashboard principal con wallet mini y accesos rápidos.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { hasWallet, loadWallet, generateWallet, registerWalletOnServer } from '../services/walletService';
import { countWhitelist } from '../db/whitelistRepository';
import { getAllSellos } from '../db/sellosRepository';
import { getAllValidaciones } from '../db/validacionesRepository';

const StatCard = ({ label, value, color }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color: color || Colors.accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionRow = ({ icon, title, subtitle, color, onPress }) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.actionIcon, { backgroundColor: color + '22' }]}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </View>
    <View style={styles.actionText}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{subtitle}</Text>
    </View>
    <Text style={styles.actionArrow}>›</Text>
  </TouchableOpacity>
);

const InicioScreen = ({ navigation }) => {
  const [wallet,       setWallet]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [whitelistCnt, setWhitelistCnt] = useState(0);
  const [sellosCnt,    setSellosCnt]    = useState(0);
  const [validCnt,     setValidCnt]     = useState(0);

  const loadData = useCallback(async () => {
    const w = await loadWallet();
    setWallet(w);
    setWhitelistCnt(countWhitelist());
    setSellosCnt(getAllSellos().length);
    setValidCnt(getAllValidaciones().length);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCreateWallet = async () => {
    setCreating(true);
    try {
      const w = await generateWallet();
      await registerWalletOnServer('Mi Wallet');
      setWallet(w);
    } catch (e) {
      console.warn('[Inicio] createWallet error:', e);
    } finally { setCreating(false); }
  };

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>NFC Sign</Text>
          <Text style={styles.headerSub}>stamping.io · demo</Text>
        </View>
        <View style={styles.headerBadge}>
          <View style={[styles.dot, { backgroundColor: wallet ? Colors.success : Colors.error }]} />
          <Text style={styles.headerBadgeText}>{wallet ? 'Wallet activa' : 'Sin wallet'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Wallet card */}
        {wallet ? (
          <View style={styles.walletCard}>
            <Text style={styles.walletLabel}>Mi wallet</Text>
            <Text style={styles.walletAddress} numberOfLines={1}>{wallet.address}</Text>
            <View style={styles.walletRow}>
              <View style={styles.walletBadge}><Text style={styles.walletBadgeText}>AUTORIZADO</Text></View>
              <View style={styles.walletStatus}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                <Text style={styles.walletStatusText}>
                  {whitelistCnt} en lista blanca
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.createWalletCard} onPress={handleCreateWallet} disabled={creating}>
            {creating ? (
              <ActivityIndicator color={Colors.accent} />
            ) : (
              <>
                <Text style={styles.createWalletIcon}>🔑</Text>
                <Text style={styles.createWalletTitle}>Crear mi wallet</Text>
                <Text style={styles.createWalletSub}>
                  Genera tu identidad ECDSA para firmar documentos
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Sellos" value={sellosCnt} color={Colors.accent} />
          <StatCard label="Validaciones" value={validCnt} color={Colors.success} />
          <StatCard label="Firmantes" value={whitelistCnt} color={Colors.warning} />
        </View>

        {/* Acciones rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.actionsCard}>
            <ActionRow
              icon="🔏"
              title="Nuevo sello"
              subtitle="Escanear QR y firmar en NFC"
              color={Colors.accent}
              onPress={() => navigation.navigate('SellarTab', { screen: 'NuevoSello' })}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="🛡️"
              title="Nueva validación"
              subtitle="Verificar firma en tag NFC"
              color={Colors.success}
              onPress={() => navigation.navigate('ValidarTab', { screen: 'NuevaValidacion' })}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="👛"
              title="Mi wallet"
              subtitle="Ver address y lista blanca"
              color={Colors.warning}
              onPress={() => navigation.navigate('WalletTab')}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:  { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 0.5 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.bgBorder },
  headerBadgeText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Wallet card
  walletCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.sm },
  walletLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 0.1, textTransform: 'uppercase' },
  walletAddress: { fontSize: FontSize.sm, color: Colors.accent, fontFamily: 'monospace', letterSpacing: 0.3 },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, backgroundColor: Colors.accentGlow, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.accentDim },
  walletBadgeText: { fontSize: 9, color: Colors.accent, fontWeight: FontWeight.bold, letterSpacing: 1 },
  walletStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walletStatusText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Create wallet
  createWalletCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.bgBorder, borderStyle: 'dashed', alignItems: 'center', gap: Spacing.sm },
  createWalletIcon:  { fontSize: 36 },
  createWalletTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  createWalletSub:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard:  { flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.bgBorder },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Acciones
  section:      { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 2 },
  actionsCard:  { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.bgBorder, overflow: 'hidden' },
  actionRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, gap: Spacing.md },
  actionIcon:   { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionText:   { flex: 1 },
  actionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  actionSub:    { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actionArrow:  { fontSize: 22, color: Colors.textMuted },
  divider:      { height: 1, backgroundColor: Colors.bgBorder, marginLeft: Spacing.md + 42 + Spacing.md },
});

export default InicioScreen;
