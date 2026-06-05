/**
 * screens/WalletScreen.js
 * Mi address + lista blanca + sincronizar del backend.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
  Alert, Clipboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { loadWallet, generateWallet, registerWalletOnServer, fetchWhitelist } from '../services/walletService';
import { syncWhitelist, getWhitelist } from '../db/whitelistRepository';

const AddressItem = ({ item, isMe }) => (
  <View style={[styles.addrItem, isMe && { borderColor: Colors.accentDim }]}>
    <View style={[styles.addrAvatar, isMe && { backgroundColor: Colors.accentGlow }]}>
      <Text style={[styles.addrAvatarText, isMe && { color: Colors.accent }]}>
        {(item.label || '?').slice(0, 2).toUpperCase()}
      </Text>
    </View>
    <View style={styles.addrInfo}>
      <View style={styles.addrRow}>
        <Text style={styles.addrName}>{item.label || 'Sin nombre'}</Text>
        {isMe && <View style={styles.meBadge}><Text style={styles.meBadgeText}>YO</Text></View>}
      </View>
      <Text style={styles.addrHex} numberOfLines={1}>
        {item.address.slice(0, 12)}...{item.address.slice(-8)}
      </Text>
    </View>
    <View style={styles.addrDot} />
  </View>
);

const WalletScreen = () => {
  const [wallet,    setWallet]    = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [syncing,   setSyncing]   = useState(false);
  const [creating,  setCreating]  = useState(false);

  const loadData = useCallback(async () => {
    const w = await loadWallet();
    setWallet(w);
    setWhitelist(getWhitelist());
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCreate = async () => {
    setCreating(true);
    try {
      const w   = await generateWallet();
      const res = await registerWalletOnServer('Mi Wallet');
      setWallet(w);
      Alert.alert('Wallet creada', `Address: ${w.address}\n\n${res.message || ''}`);
      await loadData();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setCreating(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const wallets = await fetchWhitelist();
      syncWhitelist(wallets);
      setWhitelist(getWhitelist());
      Alert.alert('Lista actualizada', `${wallets.length} firmantes sincronizados`);
    } catch (e) {
      Alert.alert('Error de sincronización', e.message);
    } finally { setSyncing(false); }
  };

  const handleCopy = () => {
    if (!wallet) return;
    Clipboard.setString(wallet.address);
    Alert.alert('Copiado', 'Address copiado al portapapeles');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Mi wallet */}
        {wallet ? (
          <View style={styles.walletCard}>
            <Text style={styles.walletCardLabel}>Mi address (pública)</Text>
            <Text style={styles.walletCardAddress}>{wallet.address}</Text>
            <View style={styles.walletBtns}>
              <TouchableOpacity style={styles.walletBtn} onPress={handleCopy}>
                <Text style={styles.walletBtnIcon}>📋</Text>
                <Text style={styles.walletBtnText}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletBtn} onPress={async () => {
                try {
                  const res = await registerWalletOnServer('Mi Wallet');
                  Alert.alert('Resultado', res.message);
                } catch (e) { Alert.alert('Error', e.message); }
              }}>
                <Text style={styles.walletBtnIcon}>📤</Text>
                <Text style={styles.walletBtnText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.createCard} onPress={handleCreate} disabled={creating}>
            {creating ? (
              <ActivityIndicator color={Colors.accent} size="large" />
            ) : (
              <>
                <Text style={{ fontSize: 40 }}>🔑</Text>
                <Text style={styles.createTitle}>Crear mi wallet</Text>
                <Text style={styles.createSub}>Genera tu identidad ECDSA para firmar</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Lista blanca */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Lista blanca</Text>
            <Text style={styles.sectionCount}>{whitelist.length} firmantes</Text>
          </View>

          <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : (
              <>
                <Text style={styles.syncIcon}>🔄</Text>
                <Text style={styles.syncText}>Sincronizar del servidor</Text>
              </>
            )}
          </TouchableOpacity>

          {whitelist.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>
                Sin firmantes. Sincroniza para descargar la lista.
              </Text>
            </View>
          ) : (
            <View style={styles.addrList}>
              {whitelist.map(item => (
                <AddressItem
                  key={item.id}
                  item={item}
                  isMe={wallet && item.address.toLowerCase() === wallet.address.toLowerCase()}
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  header:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  scroll:  { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  walletCard: { backgroundColor: '#0d1f1f', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.md },
  walletCardLabel:   { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 0.1, textTransform: 'uppercase' },
  walletCardAddress: { fontSize: FontSize.xs, color: Colors.accent, fontFamily: 'monospace', lineHeight: 18, letterSpacing: 0.3 },
  walletBtns: { flexDirection: 'row', gap: Spacing.sm },
  walletBtn:  { flex: 1, backgroundColor: Colors.accentGlow, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.accentDim, paddingVertical: Spacing.sm + 2, alignItems: 'center', gap: 4 },
  walletBtnIcon: { fontSize: 18 },
  walletBtnText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.medium },

  createCard:  { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.bgBorder, borderStyle: 'dashed', alignItems: 'center', gap: Spacing.sm },
  createTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  createSub:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  section:     { gap: Spacing.sm },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  sectionTitle:{ fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase' },
  sectionCount:{ fontSize: FontSize.xs, color: Colors.textSecondary },

  syncBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder },
  syncIcon: { fontSize: 18 },
  syncText: { fontSize: FontSize.md, color: Colors.accent, fontWeight: FontWeight.medium },

  emptyList:    { backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.bgBorder },
  emptyListText:{ fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  addrList: { gap: Spacing.xs },
  addrItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder },
  addrAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  addrAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  addrInfo: { flex: 1, gap: 3 },
  addrRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  addrName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  addrHex:  { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace' },
  addrDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  meBadge:  { paddingHorizontal: 5, paddingVertical: 1, backgroundColor: Colors.accentGlow, borderRadius: 4 },
  meBadgeText: { fontSize: 9, color: Colors.accent, fontWeight: FontWeight.black, letterSpacing: 0.5 },
});

export default WalletScreen;
