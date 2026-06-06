import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Clipboard, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import QRDisplay from '../components/QRDisplay';
import { Spacing, Radius, FontWeight } from '../theme';
import { RFontSize, rs } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import Icon from '../components/Icon';
import { loadWallet, generateWallet, registerWalletOnServer, fetchWhitelist, hasPinSetup } from '../services/walletService';
import { syncWhitelist, getWhitelist } from '../db/whitelistRepository';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const QR_SIZE   = isTablet ? 180 : 140;

const AddressItem = ({ item, isMe, theme, s }) => (
  <View style={[s.addrItem, {
    backgroundColor: theme.bgCard,
    borderColor: isMe ? theme.accent : theme.bgBorder,
  }]}>
    <View style={[s.addrAvatar, { backgroundColor: isMe ? theme.accentGlow : theme.bgSurface }]}>
      <Text style={[s.addrAvatarTxt, { color: isMe ? theme.accent : theme.textSecondary, fontSize: RFontSize.sm }]}>
        {(item.label || '?').slice(0, 2).toUpperCase()}
      </Text>
    </View>
    <View style={s.addrInfo}>
      <View style={s.addrRow}>
        <Text style={[s.addrName, { color: theme.textPrimary, fontSize: RFontSize.sm }]}>
          {item.label || 'Sin nombre'}
        </Text>
        {isMe && (
          <View style={[s.meBadge, { backgroundColor: theme.accentGlow }]}>
            <Text style={[s.meBadgeTxt, { color: theme.accent }]}>YO</Text>
          </View>
        )}
      </View>
      <Text style={[s.addrHex, { color: theme.textMuted, fontSize: RFontSize.xs }]} numberOfLines={1}>
        {item.address.slice(0, 14)}...{item.address.slice(-8)}
      </Text>
    </View>
    <View style={[s.addrDot, { backgroundColor: theme.success }]} />
  </View>
);

const makeStyles = (t) => StyleSheet.create({
  safe:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1 },
  headerTitle: { fontWeight: FontWeight.bold },
  themeBtn:{ padding: Spacing.sm },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  walletCard:   { borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  qrContainer:  { width: '100%', alignItems: 'center' },
  qrBox:        { padding: 12, backgroundColor: '#fff', borderRadius: Radius.md },
  walletLabel:  { fontSize: RFontSize.xs, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' },
  walletAddress:{ fontSize: RFontSize.xs, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', textAlign: 'center', lineHeight: 18 },
  walletBtns:   { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  walletBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, paddingVertical: Spacing.sm + 2 },
  walletBtnTxt: { fontSize: RFontSize.sm, color: '#fff', fontWeight: FontWeight.medium },

  createCard:   { borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', gap: Spacing.md },
  createIconBox:{ width: 72, height: 72, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  createTitle:  { fontWeight: FontWeight.bold, textAlign: 'center' },
  createSub:    { textAlign: 'center', lineHeight: 20 },

  section:      { gap: Spacing.sm },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  sectionTitle: { fontSize: RFontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase' },
  sectionCount: {},

  syncBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  syncTxt:  { fontWeight: FontWeight.medium },

  emptyList:    { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', borderWidth: 1 },
  emptyListTxt: { textAlign: 'center', lineHeight: 20 },

  addrList: { gap: Spacing.xs },
  addrItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  addrAvatar:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addrAvatarTxt:{ fontWeight: FontWeight.bold },
  addrInfo: { flex: 1, gap: 3 },
  addrRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  addrName: { fontWeight: FontWeight.semibold },
  addrHex:  { fontFamily: 'monospace' },
  addrDot:  { width: 8, height: 8, borderRadius: 4 },
  meBadge:  { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  meBadgeTxt:{ fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
});

const WalletScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const s = makeStyles(theme);

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
      await generateWallet();
      try { await registerWalletOnServer('Mi Wallet'); } catch {}
      await loadData();
      showToast('Wallet creada correctamente', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setCreating(false); }
  };

  const handleCopy = () => {
    if (!wallet) return;
    Clipboard.setString(wallet.address);
    showToast('Address copiado', 'success');
  };

  const handleRegister = async () => {
    try {
      const res = await registerWalletOnServer('Mi Wallet');
      showToast(res.message || 'Registrado', res.ok ? 'success' : 'error');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const wallets = await fetchWhitelist();
      if (wallets && wallets.length >= 0) {
        syncWhitelist(wallets);
        const updated = getWhitelist();
        setWhitelist(updated);
        showToast(wallets.length + ' firmantes sincronizados', 'success');
      }
    } catch (e) {
      console.warn('[Wallet] sync error:', e.message);
      showToast('Error de sincronización: ' + e.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.bgBorder }]}>
        <Text style={[s.headerTitle, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
          Wallet
        </Text>
        <TouchableOpacity onPress={toggleTheme} style={s.themeBtn}>
          <Icon name={isDark ? 'sun' : 'moon'} size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {wallet ? (
          <View style={[s.walletCard, { backgroundColor: theme.brand }]}>
            {/* QR centrado */}
            <View style={s.qrContainer}>
              <View style={s.qrBox}>
                <QRDisplay value={wallet.address} size={QR_SIZE} theme={theme} />
              </View>
            </View>

            {/* Address */}
            <Text style={s.walletLabel}>Mi address (pública)</Text>
            <Text style={s.walletAddress}>{wallet.address}</Text>

            {/* Acciones */}
            <View style={s.walletBtns}>
              <TouchableOpacity style={s.walletBtn} onPress={handleCopy}>
                <Icon name="copy" size={18} color="#fff" />
                <Text style={s.walletBtnTxt}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.walletBtn} onPress={handleRegister}>
                <Icon name="sync" size={18} color="#fff" />
                <Text style={s.walletBtnTxt}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.createCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={theme.accent} size="large" />
            ) : (
              <>
                <View style={[s.createIconBox, { backgroundColor: theme.accentGlow }]}>
                  <Icon name="lockOpen" size={36} color={theme.accent} />
                </View>
                <Text style={[s.createTitle, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
                  Crear mi wallet
                </Text>
                <Text style={[s.createSub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
                  Genera tu identidad ECDSA para firmar documentos
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Lista blanca */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={[s.sectionTitle, { color: theme.textMuted }]}>Lista blanca</Text>
            <Text style={[s.sectionCount, { color: theme.textSecondary, fontSize: RFontSize.xs }]}>
              {whitelist.length} firmantes
            </Text>
          </View>

          <TouchableOpacity
            style={[s.syncBtn, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing
              ? <ActivityIndicator color={theme.accent} size="small" />
              : <Icon name="sync" size={18} color={theme.accent} />
            }
            <Text style={[s.syncTxt, { color: theme.accent, fontSize: RFontSize.md }]}>
              {syncing ? 'Sincronizando...' : 'Sincronizar del servidor'}
            </Text>
          </TouchableOpacity>

          {whitelist.length === 0 ? (
            <View style={[s.emptyList, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Text style={[s.emptyListTxt, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
                Sin firmantes. Sincroniza para descargar la lista.
              </Text>
            </View>
          ) : (
            <View style={s.addrList}>
              {whitelist.map(item => (
                <AddressItem
                  key={item.id}
                  item={item}
                  isMe={wallet && item.address.toLowerCase() === wallet.address.toLowerCase()}
                  theme={theme}
                  s={s}
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen;
