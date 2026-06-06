import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { useNfcGuardControl } from '../context/NfcGuardContext';
import { RFontSize, rs } from '../utils/responsive';
import Icon from '../components/Icon';
import { getAllSellos, deleteSello } from '../db/sellosRepository';
import { useNfcWriter, useNfcWriterWithUid } from '../hooks/useNfcWriter';
import PinConfirmModal from '../components/PinConfirmModal';
import { decryptPrivateKey, signWithKey } from '../services/walletService';

import NfcSheet from '../components/NfcSheet';
import { hashTrama, shortHash } from '../utils/hash';
import { buildSignPayload } from '../utils/tramaParser';

const { width } = Dimensions.get('window');

// ── Fecha bonita ──────────────────────────────────────────
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-PE', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

// ── Badge de vencimiento ──────────────────────────────────
const VenceBadge = ({ fecha, theme }) => {
  if (!fecha) return null;
  // fecha es DD/MM/YYYY
  const [d, m, y] = fecha.split('/');
  const vence     = new Date(`${y}-${m}-${d}`);
  const diff      = (vence - new Date()) / (1000*60*60*24);
  const expired   = diff < 0;
  const soon      = diff >= 0 && diff <= 30;
  const color     = expired ? theme.error : soon ? theme.warning : theme.success;
  const bg        = expired ? theme.errorGlow : soon ? theme.warningGlow : theme.successGlow;
  const label     = expired ? 'Vencido' : `Vence ${fecha}`;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.badgeTxt, { color, fontSize: RFontSize.xs - 1 }]}>{label}</Text>
    </View>
  );
};

// ── Card de sello ─────────────────────────────────────────
const SelloCard = ({ item, onPress, theme }) => {
  const [expanded, setExpanded] = useState(false);
  const hash = shortHash(item.trama);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {/* Fila superior: hash + tipo + chevron */}
      <View style={styles.cardTop}>
        <View style={[styles.hashBadge, { backgroundColor: theme.accentGlow }]}>
          <Text style={[styles.hashTxt, { color: theme.accent, fontSize: RFontSize.xs }]}>
            #{hash}
          </Text>
        </View>
        <View style={[styles.tipoBadge, { backgroundColor: theme.bgSurface }]}>
          <Text style={[styles.tipoTxt, { color: theme.textSecondary, fontSize: RFontSize.xs }]}>
            {item.tipo_doc || 'DOC'}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Icon name="chevronRight" size={RFontSize.md} color={theme.textMuted} />
      </View>

      {/* Número de identidad */}
      <Text style={[styles.numId, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
        {item.num_id || '—'}
      </Text>

      {/* Doc Ref + vencimiento */}
      <View style={styles.cardMid}>
        <Text style={[styles.docRef, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
          Nro Doc Ref: <Text style={{ color: theme.textPrimary, fontWeight: FontWeight.semibold }}>
            {item.doc_id || '—'}
          </Text>
        </Text>
        <VenceBadge fecha={item.fecha_venc} theme={theme} />
      </View>

      {/* Fecha de sello */}
      <Text style={[styles.cardDate, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
        Sellado: {fmtDate(item.created_at)}
      </Text>

      {/* Texto adicional (acordeón) */}
      {item.texto_libre ? (
        <TouchableOpacity
          style={[styles.acordeon, { borderTopColor: theme.bgBorder }]}
          onPress={(e) => { e.stopPropagation?.(); setExpanded(!expanded); }}
        >
          <Text style={[styles.acordeonLabel, { color: theme.accent, fontSize: RFontSize.xs }]}>
            Texto adicional {expanded ? '▲' : '▼'}
          </Text>
          {expanded && (
            <Text style={[styles.acordeonContent, { color: theme.textSecondary, fontSize: RFontSize.xs }]}>
              {item.texto_libre}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

// ── Modal detalle / trazabilidad ──────────────────────────
const SelloDetail = ({ sello, visible, onClose, onDelete, onRewrite, theme }) => {
  if (!sello) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.bgSurface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.bgBorder }]} />

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: theme.bgBorder }]}>
            <View style={[styles.sheetIconBox, { backgroundColor: theme.accentGlow }]}>
              <Icon name="lock" size={RFontSize.xl} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
                {sello.doc_id || 'Doc sin ID'}
              </Text>
              <Text style={[styles.sheetSub, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                #{shortHash(sello.trama)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: rs(Spacing.xs) }}>
              <Icon name="xCircle" size={RFontSize.xl} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[styles.sheetContent, { paddingBottom: rs(Spacing.xxl) }]}>

            {/* Datos */}
            <View style={[styles.detailCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Text style={[styles.detailCardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                DOCUMENTO
              </Text>
              {[
                ['Tipo',        sello.tipo_doc],
                ['Número',      sello.num_id],
                ['Doc Ref',     sello.doc_id],
                ['Vencimiento', sello.fecha_venc],
                ['ID Firmante', sello.firmante_id],
              ].map(([l, v]) => v ? (
                <View key={l} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>{l}</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary, fontSize: RFontSize.sm }]}>{v}</Text>
                </View>
              ) : null)}
              {sello.texto_libre ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>Texto libre</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary, fontSize: RFontSize.xs, fontFamily: 'monospace', maxWidth: '60%', textAlign: 'right' }]} numberOfLines={4}>
                    {sello.texto_libre}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* NFC */}
            <View style={[styles.detailCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Text style={[styles.detailCardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                SELLO NFC
              </Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>UID Tag</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary, fontSize: RFontSize.xs, fontFamily: 'monospace' }]}>
                  {sello.nfc_uid || 'No registrado'}
                </Text>
              </View>
              <Text style={[styles.firmaLabel, { color: theme.textMuted, fontSize: RFontSize.xs }]}>Firma</Text>
              <Text style={[styles.firmaHex, { color: theme.accent, fontSize: RFontSize.xs }]} numberOfLines={3}>
                {sello.firma_hex}
              </Text>
            </View>

            {/* Trama */}
            <View style={[styles.detailCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Text style={[styles.detailCardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                TRAMA COMPLETA
              </Text>
              <Text style={[styles.tramaText, { color: theme.accent, fontSize: RFontSize.xs }]}>
                {sello.trama}
              </Text>
              <Text style={[{ color: theme.textMuted, fontSize: RFontSize.xs - 1, marginTop: 4 }]}>
                Hash: {hashTrama(sello.trama)}
              </Text>
            </View>

            {/* Acciones */}
            <TouchableOpacity
              style={[styles.rewriteBtn, { backgroundColor: theme.accent }]}
              onPress={() => onRewrite(sello)}
            >
              <Icon name="nfc" size={RFontSize.lg} color={theme.bgSurface} />
              <Text style={[styles.rewriteTxt, { color: theme.bgSurface, fontSize: RFontSize.md }]}>
                Reescribir en tag NFC
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: theme.errorDim }]}
              onPress={() => onDelete(sello.id)}
            >
              <Icon name="trash" size={RFontSize.md} color={theme.error} />
              <Text style={[styles.deleteTxt, { color: theme.error, fontSize: RFontSize.sm }]}>
                Eliminar sello
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Pantalla ──────────────────────────────────────────────
const SellosScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { showToast }     = useToast();
  const [sellos,     setSellos]     = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [nfcSheet,   setNfcSheet]   = useState(false);
  const [nfcStatus,  setNfcStatus]  = useState('waiting');
  const [nfcMsg,     setNfcMsg]     = useState(null);
  const [pinModal,   setPinModal]   = useState(false);
  const [pendingSello, setPendingSello] = useState(null);
  const { writeTag }          = useNfcWriter();
  const { writeTagWithUid }   = useNfcWriterWithUid();
  const { pause, resume }     = useNfcGuardControl();

  useFocusEffect(useCallback(() => {
    const data = getAllSellos();
    console.log('[Sellos] cargados:', data.length);
    setSellos(data);
  }, []));

  const handleDelete = (id) => {
    deleteSello(id);
    setSellos(getAllSellos());
    setDetailOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showToast('Sello eliminado', 'warning');
  };

  const handleRewrite = (sello) => {
    setDetailOpen(false);
    setPendingSello(sello);
    setPinModal(true);
  };

  const handleRewritePinSuccess = async (confirmedPin) => {
    setPinModal(false);
    if (!pendingSello) return;

    const sello = pendingSello;
    setPendingSello(null);

    // PASO LENTO primero (descifrado) — SIN tag pegado, con toast
    showToast('Verificando PIN...', 'info');
    let privKeyBytes;
    try {
      privKeyBytes = await decryptPrivateKey(confirmedPin);
    } catch (e) {
      showToast(e.message || 'PIN incorrecto', 'error');
      return;
    }

    // Ahora sí: pad NFC. Lo que sigue es instantáneo.
    await new Promise(r => setTimeout(r, 300));
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg('');

    await pause();  // liberar canal NFC
    let firmaGenerada = '';
    const result = await writeTagWithUid(async (uid) => {
      const payload = buildSignPayload(sello.trama, uid);
      firmaGenerada = signWithKey(payload, privKeyBytes);  // instantáneo
      return firmaGenerada;
    });

    // limpiar clave de memoria
    if (privKeyBytes) privKeyBytes.fill(0);

    if (result.success) {
      setNfcStatus('success');
      setNfcMsg('Firma reescrita y vinculada al nuevo tag');
      showToast('Tag reescrito correctamente', 'success');
    } else {
      setNfcStatus('error');
      setNfcMsg(result.error || 'Error al reescribir');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: theme.bgSurface, borderBottomColor: theme.bgBorder }]}>
        <Icon name="seal" size={RFontSize.xl} color={theme.accent} />
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
          Sellos
        </Text>
        <Text style={[styles.headerCount, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
          {sellos.length}
        </Text>
      </View>

      <FlatList
        data={sellos}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={[
          { padding: rs(Spacing.md), gap: rs(Spacing.sm) },
          sellos.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Icon name="seal" size={RFontSize.hero} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
              Sin sellos
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary, fontSize: RFontSize.md }]}>
              Los sellos creados aparecerán aquí
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SelloCard item={item} onPress={(s) => { setSelected(s); setDetailOpen(true); }} theme={theme} />
        )}
      />

      {/* FAB */}
      {sellos.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
          onPress={() => navigation.navigate('NuevoSello')}
        >
          <Icon name="plus" size={RFontSize.xl} color={theme.bgSurface} />
        </TouchableOpacity>
      )}

      <SelloDetail
        sello={selected} visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDelete={handleDelete} onRewrite={handleRewrite}
        theme={theme}
      />

      <NfcSheet visible={nfcSheet} mode="write" status={nfcStatus} message={nfcMsg}
        onCancel={() => { setNfcSheet(false); resume(); }} />
      <PinConfirmModal visible={pinModal} onSuccess={handleRewritePinSuccess} onCancel={() => setPinModal(false)} theme={theme} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(Spacing.md), paddingVertical: rs(Spacing.sm + 2), borderBottomWidth: 1, gap: rs(Spacing.sm) },
  headerTitle:  { fontWeight: FontWeight.bold, flex: 1 },
  headerCount:  {},

  card:         { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, gap: rs(6) },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.xs) },
  hashBadge:    { paddingHorizontal: rs(8), paddingVertical: rs(2), borderRadius: Radius.full },
  hashTxt:      { fontFamily: 'monospace', fontWeight: FontWeight.bold },
  tipoBadge:    { paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: Radius.sm },
  tipoTxt:      { fontWeight: FontWeight.medium, letterSpacing: 0.3 },
  numId:        { fontWeight: FontWeight.black, letterSpacing: 0.5 },
  cardMid:      { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.sm), flexWrap: 'wrap' },
  docRef:       { flex: 1 },
  badge:        { paddingHorizontal: rs(8), paddingVertical: rs(2), borderRadius: Radius.full, borderWidth: 1 },
  badgeTxt:     { fontWeight: FontWeight.bold },
  cardDate:     { letterSpacing: 0.2 },
  acordeon:     { marginTop: rs(Spacing.xs), paddingTop: rs(Spacing.xs), borderTopWidth: 1 },
  acordeonLabel:{ fontWeight: FontWeight.medium },
  acordeonContent:{ marginTop: rs(4), lineHeight: 18, fontFamily: 'monospace' },

  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.md), padding: rs(Spacing.xl) },
  emptyIconBox: { width: rs(80), height: rs(80), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle:   { fontWeight: FontWeight.bold },
  emptySub:     { textAlign: 'center' },

  fab:          { position: 'absolute', bottom: rs(Spacing.xl), right: rs(Spacing.lg), width: rs(56), height: rs(56), borderRadius: rs(28), alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '88%' },
  sheetHandle:  { width: rs(40), height: rs(4), borderRadius: rs(2), alignSelf: 'center', marginTop: rs(Spacing.md) },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.md), paddingHorizontal: rs(Spacing.lg), paddingVertical: rs(Spacing.md), borderBottomWidth: 1 },
  sheetIconBox: { width: rs(48), height: rs(48), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  sheetTitle:   { fontWeight: FontWeight.bold },
  sheetSub:     { fontFamily: 'monospace', marginTop: 2 },
  sheetContent: { padding: rs(Spacing.lg), gap: rs(Spacing.md) },

  detailCard:      { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, gap: rs(6) },
  detailCardTitle: { fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: rs(4) },
  detailRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(3) },
  detailLabel:     { flex: 1 },
  detailValue:     { maxWidth: '60%', textAlign: 'right', fontWeight: FontWeight.medium },
  firmaLabel:      { marginTop: rs(4) },
  firmaHex:        { fontFamily: 'monospace', lineHeight: 18 },
  tramaText:       { fontFamily: 'monospace', lineHeight: 18 },

  rewriteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.sm), borderRadius: Radius.md, paddingVertical: rs(Spacing.md), shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  rewriteTxt:   { fontWeight: FontWeight.bold },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.sm), borderRadius: Radius.md, paddingVertical: rs(Spacing.md), borderWidth: 1 },
  deleteTxt:    { fontWeight: FontWeight.medium },
});

export default SellosScreen;
