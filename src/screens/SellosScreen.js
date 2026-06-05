/**
 * screens/SellosScreen.js
 * Lista de sellos generados + FAB para nuevo sello.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { getAllSellos, deleteSello } from '../db/sellosRepository';

const EmptyState = ({ onNew }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>🔏</Text>
    <Text style={styles.emptyTitle}>Sin sellos aún</Text>
    <Text style={styles.emptySub}>Toca el botón + para sellar tu primer documento</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onNew}>
      <Text style={styles.emptyBtnText}>+ Nuevo sello</Text>
    </TouchableOpacity>
  </View>
);

const SelloItem = ({ item, onDelete }) => {
  const date = new Date(item.created_at).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={styles.itemIconBox}>
          <Text style={{ fontSize: 18 }}>🔏</Text>
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemDocId} numberOfLines={1}>{item.doc_id || 'Doc sin ID'}</Text>
          <Text style={styles.itemTrama} numberOfLines={1}>{item.trama}</Text>
          <Text style={styles.itemDate}>{date}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.itemDelete} onPress={() => onDelete(item.id)}>
        <Text style={{ fontSize: 16, color: Colors.error }}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
};

const SellosScreen = ({ navigation }) => {
  const [sellos, setSellos] = useState([]);

  useFocusEffect(useCallback(() => {
    const data = getAllSellos();
    console.log("[Sellos] cargados:", data.length);
    setSellos(data);
  }, []));

  const handleDelete = (id) => {
    deleteSello(id);
    setSellos(getAllSellos());
  };

  const handleNew = () => navigation.navigate('NuevoSello');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sellos</Text>
        <Text style={styles.headerCount}>{sellos.length} registros</Text>
      </View>

      <FlatList
        data={sellos}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={[styles.list, sellos.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<EmptyState onNew={handleNew} />}
        renderItem={({ item }) => <SelloItem item={item} onDelete={handleDelete} />}
      />

      {sellos.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleNew}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerCount: { fontSize: FontSize.xs, color: Colors.textMuted },
  list:      { padding: Spacing.md, gap: Spacing.xs },
  listEmpty: { flex: 1 },
  sep:       { height: 1, backgroundColor: Colors.bgBorder, marginLeft: Spacing.md + 44 + Spacing.md },
  item:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder },
  itemLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemIconBox: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  itemText:  { flex: 1 },
  itemDocId: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  itemTrama: { fontSize: FontSize.xs, color: Colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  itemDate:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  itemDelete:{ padding: Spacing.sm },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 52 },
  emptyTitle:{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptySub:  { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn:  { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.accent, borderRadius: Radius.md },
  emptyBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.bg },
  fab: { position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  fabText: { fontSize: 30, color: Colors.bg, fontWeight: FontWeight.bold, lineHeight: 34 },
});

export default SellosScreen;
