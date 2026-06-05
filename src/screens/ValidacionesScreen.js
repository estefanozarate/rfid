/**
 * screens/ValidacionesScreen.js
 * Lista de validaciones + FAB para nueva verificación.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { getAllValidaciones } from '../db/validacionesRepository';

const ValidacionItem = ({ item }) => {
  const isValid = item.resultado === 'valido';
  const date = new Date(item.created_at).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <View style={[styles.item, { borderLeftColor: isValid ? Colors.success : Colors.error, borderLeftWidth: 3 }]}>
      <View style={[styles.itemIcon, { backgroundColor: isValid ? Colors.successGlow : Colors.errorGlow }]}>
        <Text style={{ fontSize: 18 }}>{isValid ? '✓' : '✕'}</Text>
      </View>
      <View style={styles.itemText}>
        <View style={styles.itemRow}>
          <Text style={styles.itemDocId} numberOfLines={1}>{item.doc_id || 'Doc sin ID'}</Text>
          <View style={[styles.badge, { backgroundColor: isValid ? Colors.successGlow : Colors.errorGlow }]}>
            <Text style={[styles.badgeText, { color: isValid ? Colors.success : Colors.error }]}>
              {isValid ? 'VÁLIDO' : 'INVÁLIDO'}
            </Text>
          </View>
        </View>
        <Text style={styles.itemTrama} numberOfLines={1}>{item.trama}</Text>
        <Text style={styles.itemDate}>{date}</Text>
      </View>
    </View>
  );
};

const EmptyState = ({ onNew }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>🛡️</Text>
    <Text style={styles.emptyTitle}>Sin validaciones</Text>
    <Text style={styles.emptySub}>Toca el botón + para verificar un documento</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onNew}>
      <Text style={styles.emptyBtnText}>+ Nueva validación</Text>
    </TouchableOpacity>
  </View>
);

const ValidacionesScreen = ({ navigation }) => {
  const [validaciones, setValidaciones] = useState([]);

  useFocusEffect(useCallback(() => {
    setValidaciones(getAllValidaciones());
  }, []));

  const handleNew = () => navigation.navigate('NuevaValidacion');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Validaciones</Text>
        <Text style={styles.headerCount}>{validaciones.length} registros</Text>
      </View>

      <FlatList
        data={validaciones}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={[styles.list, validaciones.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
        ListEmptyComponent={<EmptyState onNew={handleNew} />}
        renderItem={({ item }) => <ValidacionItem item={item} />}
      />

      {validaciones.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleNew}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerCount: { fontSize: FontSize.xs, color: Colors.textMuted },
  list:     { padding: Spacing.md, gap: Spacing.xs },
  listEmpty:{ flex: 1 },
  item:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.md },
  itemIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 3 },
  itemRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemDocId:{ fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, flex: 1 },
  itemTrama:{ fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace' },
  itemDate: { fontSize: FontSize.xs, color: Colors.textSecondary },
  badge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  badgeText:{ fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIcon:{ fontSize: 52 },
  emptyTitle:{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptySub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.success, borderRadius: Radius.md },
  emptyBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.bg },
  fab: { position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  fabText: { fontSize: 30, color: Colors.bg, fontWeight: FontWeight.bold, lineHeight: 34 },
});

export default ValidacionesScreen;
