/**
 * screens/SellosScreen.js
 * Lista de sellos + detalle con opción de reescribir el tag NFC.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, FlatList, Modal, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { getAllSellos, deleteSello } from '../db/sellosRepository';
import { useNfcWriter } from '../hooks/useNfcWriter';
import NfcSheet from '../components/NfcSheet';
import Icon from '../components/Icon';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const fs        = (n) => isTablet ? n * 1.25 : n;

// ── Empty state ───────────────────────────────────────────
const EmptyState = ({ onNew }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIconBox}>
      <Icon name="seal" size={40} color={Colors.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>Sin sellos aún</Text>
    <Text style={styles.emptySub}>Toca el botón + para sellar tu primer documento</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onNew}>
      <Icon name="plus" size={16} color={Colors.bg} />
      <Text style={styles.emptyBtnText}>Nuevo sello</Text>
    </TouchableOpacity>
  </View>
);

// ── Item de la lista ──────────────────────────────────────
const SelloItem = ({ item, onPress, onDelete }) => {
  const date = new Date(item.created_at).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return (
    <TouchableOpacity style={styles.item} onPress={() => onPress(item)} activeOpacity={0.75}>
      <View style={styles.itemIconBox}>
        <Icon name="lock" size={isTablet ? 26 : 22} color={Colors.accent} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemDocId, { fontSize: fs(FontSize.md) }]} numberOfLines={1}>
          {item.doc_id || 'Doc sin ID'}
        </Text>
        <Text style={[styles.itemTrama, { fontSize: fs(FontSize.xs) }]} numberOfLines={1}>
          {item.trama}
        </Text>
        <Text style={[styles.itemDate, { fontSize: fs(FontSize.xs) }]}>{date}</Text>
      </View>
      <View style={styles.itemActions}>
        <Icon name="chevronRight" size={isTablet ? 20 : 16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

// ── Modal detalle del sello ───────────────────────────────
const SelloDetail = ({ sello, visible, onClose, onDelete, onRewrite }) => {
  if (!sello) return null;
  const date = new Date(sello.created_at).toLocaleDateString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const DataRow = ({ label, value, accent, mono }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[
        styles.detailValue,
        accent && { color: Colors.accent },
        mono   && { fontFamily: 'monospace', fontSize: fs(FontSize.xs) },
      ]} numberOfLines={mono ? 2 : 1}>
        {String(value || '—')}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, isTablet && { width: 520, alignSelf: 'center', borderRadius: Radius.xl }]}>

          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalIconBox}>
              <Icon name="lock" size={isTablet ? 28 : 24} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { fontSize: fs(FontSize.lg) }]} numberOfLines={1}>
                {sello.doc_id || 'Doc sin ID'}
              </Text>
              <Text style={[styles.modalDate, { fontSize: fs(FontSize.xs) }]}>{date}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Icon name="xCircle" size={isTablet ? 24 : 20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>

            {/* Datos del documento */}
            <View style={styles.detailCard}>
              <View style={styles.detailCardTitle}>
                <Icon name="document" size={14} color={Colors.textMuted} />
                <Text style={styles.detailCardTitleText}>Documento</Text>
              </View>
              <DataRow label="Doc ID"      value={sello.doc_id}     accent />
              <DataRow label="Tipo"        value={sello.tipo_doc} />
              <DataRow label="Número"      value={sello.num_id} />
              <DataRow label="Vencimiento" value={sello.fecha_venc} />
              <DataRow label="ID firmante" value={sello.firmante_id} />
              {sello.texto_libre ? <DataRow label="Texto libre" value={sello.texto_libre} /> : null}
            </View>

            {/* Datos del sello */}
            <View style={styles.detailCard}>
              <View style={styles.detailCardTitle}>
                <Icon name="tag" size={14} color={Colors.textMuted} />
                <Text style={styles.detailCardTitleText}>Sello NFC</Text>
              </View>
              <DataRow label="UID del tag" value={sello.nfc_uid || 'No registrado'} mono />
              <DataRow label="Firma"       value={sello.firma_hex} mono />
            </View>

            {/* Trama */}
            <View style={styles.detailCard}>
              <View style={styles.detailCardTitle}>
                <Icon name="document" size={14} color={Colors.textMuted} />
                <Text style={styles.detailCardTitleText}>Trama</Text>
              </View>
              <Text style={styles.tramaText}>{sello.trama}</Text>
            </View>

            {/* Acciones */}
            <TouchableOpacity style={styles.rewriteBtn} onPress={() => onRewrite(sello)}>
              <Icon name="nfc" size={isTablet ? 22 : 18} color={Colors.bg} />
              <Text style={[styles.rewriteBtnText, { fontSize: fs(FontSize.md) }]}>
                Reescribir en tag NFC
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(sello.id)}>
              <Icon name="trash" size={isTablet ? 18 : 15} color={Colors.error} />
              <Text style={[styles.deleteBtnText, { fontSize: fs(FontSize.sm) }]}>
                Eliminar sello
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Pantalla principal ────────────────────────────────────
const SellosScreen = ({ navigation }) => {
  const [sellos,     setSellos]     = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [nfcSheet,   setNfcSheet]   = useState(false);
  const [nfcStatus,  setNfcStatus]  = useState('waiting');
  const [nfcMsg,     setNfcMsg]     = useState(null);

  const { writeTag } = useNfcWriter();

  useFocusEffect(useCallback(() => {
    const data = getAllSellos();
    console.log('[Sellos] cargados:', data.length);
    setSellos(data);
  }, []));

  const handlePress = (item) => {
    setSelected(item);
    setDetailOpen(true);
  };

  const handleDelete = (id) => {
    deleteSello(id);
    setSellos(getAllSellos());
    setDetailOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleRewrite = async (sello) => {
    setDetailOpen(false);
    await new Promise(r => setTimeout(r, 400)); // esperar que cierre el modal
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg(null);

    const result = await writeTag(sello.firma_hex);

    if (result.success) {
      setNfcStatus('success');
      setNfcMsg('Firma reescrita en el tag correctamente');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setNfcStatus('error');
      setNfcMsg(result.error || 'Error al escribir el tag');
    }
  };

  const handleNew = () => navigation.navigate('NuevoSello');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="seal" size={isTablet ? 24 : 20} color={Colors.accent} />
          <Text style={[styles.headerTitle, { fontSize: fs(FontSize.lg) }]}>Sellos</Text>
        </View>
        <Text style={[styles.headerCount, { fontSize: fs(FontSize.xs) }]}>
          {sellos.length} registros
        </Text>
      </View>

      <FlatList
        data={sellos}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={[styles.list, sellos.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<EmptyState onNew={handleNew} />}
        renderItem={({ item }) => (
          <SelloItem item={item} onPress={handlePress} onDelete={handleDelete} />
        )}
      />

      {/* FAB */}
      {sellos.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleNew}>
          <Icon name="plus" size={isTablet ? 30 : 26} color={Colors.bg} />
        </TouchableOpacity>
      )}

      {/* Modal detalle */}
      <SelloDetail
        sello={selected}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDelete={handleDelete}
        onRewrite={handleRewrite}
      />

      {/* NFC Sheet para reescribir */}
      <NfcSheet
        visible={nfcSheet}
        mode="write"
        status={nfcStatus}
        message={nfcMsg}
        onCancel={() => setNfcSheet(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.bg },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerCount: { color: Colors.textMuted },

  list:      { padding: Spacing.md },
  listEmpty: { flex: 1 },
  sep:       { height: 1, backgroundColor: Colors.bgBorder, marginLeft: Spacing.md + 44 + Spacing.md },

  item:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md - 2, paddingHorizontal: Spacing.md, gap: Spacing.md },
  itemIconBox: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  itemText:    { flex: 1 },
  itemDocId:   { fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  itemTrama:   { color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  itemDate:    { color: Colors.textSecondary, marginTop: 3 },
  itemActions: { paddingLeft: Spacing.xs },

  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIconBox:{ width: 72, height: 72, borderRadius: Radius.lg, backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.bgBorder, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptySub:    { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.accent, borderRadius: Radius.md },
  emptyBtnText:{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.bg },

  fab: { position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalHandle:  { width: 40, height: 4, backgroundColor: Colors.bgBorder, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.md },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  modalIconBox: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  modalTitle:   { fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalDate:    { color: Colors.textMuted, marginTop: 2 },
  modalClose:   { padding: Spacing.xs },
  modalScroll:  { flex: 1 },
  modalContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },

  detailCard:      { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.xs },
  detailCardTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  detailCardTitleText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4 },
  detailLabel:  { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  detailValue:  { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, maxWidth: '60%', textAlign: 'right' },
  tramaText:    { fontSize: FontSize.xs, color: Colors.accent, fontFamily: 'monospace', lineHeight: 18 },

  rewriteBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  rewriteBtnText: { fontWeight: FontWeight.bold, color: Colors.bg },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.errorDim },
  deleteBtnText:  { color: Colors.error, fontWeight: FontWeight.medium },
});

export default SellosScreen;
