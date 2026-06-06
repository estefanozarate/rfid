import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RFontSize, rs } from '../utils/responsive';
import Icon from '../components/Icon';
import { getDocumentosValidados, getValidacionesByHash } from '../db/validacionesRepository';
import { shortHash } from '../utils/hash';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-PE', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

// ── Card de documento validado ────────────────────────────
const DocValidadoCard = ({ item, onPress, theme }) => {
  const isValid = item.ultimo_resultado === 'valido';
  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: theme.bgCard,
        borderColor:     theme.bgBorder,
        borderLeftWidth: 3,
        borderLeftColor: isValid ? theme.success : theme.error,
      }]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {/* Top: hash + estado */}
      <View style={styles.cardTop}>
        <View style={[styles.hashBadge, { backgroundColor: theme.accentGlow }]}>
          <Text style={[styles.hashTxt, { color: theme.accent, fontSize: RFontSize.xs }]}>
            #{shortHash(item.trama)}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={[styles.estadoBadge, {
          backgroundColor: isValid ? theme.successGlow : theme.errorGlow,
          borderColor:     isValid ? theme.success     : theme.error,
        }]}>
          <Text style={[styles.estadoTxt, { color: isValid ? theme.success : theme.error, fontSize: RFontSize.xs - 1 }]}>
            {isValid ? 'VÁLIDO' : 'INVÁLIDO'}
          </Text>
        </View>
        <Icon name="chevronRight" size={RFontSize.md} color={theme.textMuted} />
      </View>

      {/* Número de identidad */}
      <Text style={[styles.numId, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
        {item.num_id || '—'}
      </Text>

      {/* Doc ref */}
      <View style={styles.cardMid}>
        <Text style={[styles.docRef, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
          {item.tipo_doc || 'DOC'} · Ref: <Text style={{ color: theme.textPrimary, fontWeight: FontWeight.semibold }}>
            {item.doc_id || '—'}
          </Text>
        </Text>
      </View>

      {/* Estadística de verificaciones */}
      <View style={styles.cardStats}>
        <Text style={[styles.cardStatTxt, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
          {item.total_verificaciones} verificaciones · {item.total_validos} válidas
        </Text>
        <Text style={[styles.cardStatTxt, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
          Última: {fmtDate(item.ultima_verificacion)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Modal historial de verificaciones ────────────────────
const HistorialModal = ({ doc, visible, onClose, onRepeat, theme }) => {
  const [historial, setHistorial] = useState([]);

  React.useEffect(() => {
    if (visible && doc) {
      const data = getValidacionesByHash(doc.trama_hash);
      setHistorial(data);
    }
  }, [visible, doc]);

  if (!doc) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.bgSurface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.bgBorder }]} />

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: theme.bgBorder }]}>
            <View style={[styles.sheetIconBox, { backgroundColor: theme.accentGlow }]}>
              <Icon name="shield" size={RFontSize.xl} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
                {doc.doc_id || 'Doc sin ID'}
              </Text>
              <Text style={[styles.sheetSub, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                #{shortHash(doc.trama)} · {doc.total_verificaciones} verificaciones
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: rs(Spacing.xs) }}>
              <Icon name="xCircle" size={RFontSize.xl} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[styles.sheetContent, { paddingBottom: rs(Spacing.xxl) }]}>

            {/* Datos del documento */}
            <View style={[styles.detailCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Text style={[styles.detailCardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                DOCUMENTO
              </Text>
              {[
                ['Tipo',   doc.tipo_doc],
                ['Número', doc.num_id],
                ['Ref',    doc.doc_id],
                ['Vence',  doc.fecha_venc],
              ].map(([l, v]) => v ? (
                <View key={l} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>{l}</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary, fontSize: RFontSize.sm }]}>{v}</Text>
                </View>
              ) : null)}
              {doc.texto_libre ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>Texto libre</Text>
                  <Text style={[styles.detailValue, { color: theme.textPrimary, fontSize: RFontSize.xs, fontFamily: 'monospace', maxWidth: '60%', textAlign: 'right' }]} numberOfLines={3}>
                    {doc.texto_libre}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Historial */}
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
              HISTORIAL DE VERIFICACIONES
            </Text>

            {historial.map((v, i) => {
              const isValid = v.resultado === 'valido';
              return (
                <View key={v.id} style={[styles.historialItem, {
                  backgroundColor: theme.bgCard,
                  borderColor:     isValid ? theme.success : theme.error,
                }]}>
                  <View style={[styles.historialIconBox, {
                    backgroundColor: isValid ? theme.successGlow : theme.errorGlow,
                  }]}>
                    <Icon
                      name={isValid ? 'checkCircle' : 'xCircle'}
                      size={RFontSize.lg}
                      color={isValid ? theme.success : theme.error}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historialResult, {
                      color: isValid ? theme.success : theme.error,
                      fontSize: RFontSize.sm,
                    }]}>
                      {isValid ? 'Firma válida' : 'Firma inválida'}
                    </Text>
                    {v.address_found ? (
                      <Text style={[styles.historialAddr, { color: theme.textSecondary, fontSize: RFontSize.xs }]} numberOfLines={1}>
                        {v.address_found.slice(0,14)}...{v.address_found.slice(-6)}
                      </Text>
                    ) : null}
                    <Text style={[styles.historialDate, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                      {fmtDate(v.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.historialNum, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
                    #{i + 1}
                  </Text>
                </View>
              );
            })}

            {/* Repetir verificación */}
            <TouchableOpacity
              style={[styles.repeatBtn, { backgroundColor: theme.accent }]}
              onPress={() => onRepeat(doc)}
            >
              <Icon name="refresh" size={RFontSize.lg} color={theme.bgSurface} />
              <Text style={[styles.repeatTxt, { color: theme.bgSurface, fontSize: RFontSize.md }]}>
                Repetir verificación
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Pantalla ──────────────────────────────────────────────
const ValidacionesScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [docs,       setDocs]       = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [modalOpen,  setModalOpen]  = useState(false);

  useFocusEffect(useCallback(() => {
    const data = getDocumentosValidados();
    console.log('[Validaciones] documentos únicos:', data.length);
    setDocs(data);
  }, []));

  const handleRepeat = (doc) => {
    setModalOpen(false);
    // Navegar a nueva validación pasando la trama para pre-cargar
    navigation.navigate('NuevaValidacion', { tramaPreload: doc.trama });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: theme.bgSurface, borderBottomColor: theme.bgBorder }]}>
        <Icon name="shield" size={RFontSize.xl} color={theme.accent} />
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontSize: RFontSize.lg }]}>
          Validaciones
        </Text>
        <Text style={[styles.headerCount, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
          {docs.length} docs
        </Text>
      </View>

      <FlatList
        data={docs}
        keyExtractor={i => i.trama_hash}
        contentContainerStyle={[
          { padding: rs(Spacing.md), gap: rs(Spacing.sm) },
          docs.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
              <Icon name="shield" size={RFontSize.hero} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
              Sin validaciones
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary, fontSize: RFontSize.md }]}>
              Las verificaciones aparecerán aquí agrupadas por documento
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DocValidadoCard
            item={item}
            onPress={(d) => { setSelected(d); setModalOpen(true); }}
            theme={theme}
          />
        )}
      />

      {/* FAB */}
      {docs.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.success, shadowColor: theme.success }]}
          onPress={() => navigation.navigate('NuevaValidacion')}
        >
          <Icon name="plus" size={RFontSize.xl} color={theme.bgSurface} />
        </TouchableOpacity>
      )}

      <HistorialModal
        doc={selected} visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onRepeat={handleRepeat}
        theme={theme}
      />
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
  estadoBadge:  { paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: Radius.full, borderWidth: 1 },
  estadoTxt:    { fontWeight: FontWeight.black, letterSpacing: 0.5 },
  numId:        { fontWeight: FontWeight.black, letterSpacing: 0.5 },
  cardMid:      { flexDirection: 'row', flexWrap: 'wrap' },
  docRef:       {},
  cardStats:    { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: rs(4) },
  cardStatTxt:  {},

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

  sectionLabel: { fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase' },

  historialItem:    { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.md), borderRadius: Radius.md, padding: rs(Spacing.md), borderLeftWidth: 3 },
  historialIconBox: { width: rs(40), height: rs(40), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  historialResult:  { fontWeight: FontWeight.semibold },
  historialAddr:    { fontFamily: 'monospace', marginTop: 2 },
  historialDate:    { marginTop: 2 },
  historialNum:     { fontFamily: 'monospace' },

  repeatBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.sm), borderRadius: Radius.md, paddingVertical: rs(Spacing.md), shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  repeatTxt:    { fontWeight: FontWeight.bold },
});

export default ValidacionesScreen;
