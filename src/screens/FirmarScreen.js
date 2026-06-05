/**
 * screens/FirmarScreen.js
 * ──────────────────────────────────────────────────────────
 * Pantalla que muestra los datos del QR parseados
 * más los datos de la persona encontrada en la DB.
 * Solo se llega aquí si el SELECT retornó una fila.
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

// ─── Sub-componente: fila de dato ───────────────────────────
const DataRow = ({ label, value, accent = false, mono = false }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={[
      styles.dataValue,
      accent && styles.dataValueAccent,
      mono   && styles.dataValueMono,
    ]} selectable>
      {String(value)}
    </Text>
  </View>
);

// ─── Sub-componente: separador de sección ──────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

const FirmarScreen = ({ navigation, route }) => {
  // Datos pasados desde QRScannerScreen
  const { qrData, persona } = route.params;
  const { tipo, numero, fecha, id } = qrData;

  // Formatear fecha de YYYY/MM/DD a DD/MM/YYYY
  const fechaFormateada = (() => {
    try {
      const [y, m, d] = fecha.split('/');
      return `${d}/${m}/${y}`;
    } catch {
      return fecha;
    }
  })();

  // Truncar address para display
  const addressShort = persona.address.length > 20
    ? `${persona.address.slice(0, 10)}...${persona.address.slice(-8)}`
    : persona.address;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proceso de Firma</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge de autorizado */}
        <View style={styles.authorizedBadge}>
          <View style={styles.authorizedDot} />
          <Text style={styles.authorizedText}>Usuario autorizado</Text>
        </View>

        {/* Título con ID */}
        <View style={styles.titleBlock}>
          <Text style={styles.firmarLabel}>FIRMAR</Text>
          <Text style={styles.firmarId}>ID: {id}</Text>
          <Text style={styles.firmarName}>
            {persona.nombre} {persona.apellido}
          </Text>
        </View>

        {/* Card: Datos del QR */}
        <View style={styles.card}>
          <SectionHeader title="DATOS DEL QR" />
          <DataRow
            label="Tipo de documento"
            value={tipo === '1' ? 'DNI' : 'RUC'}
            accent
          />
          <DataRow
            label={tipo === '1' ? 'DNI' : 'RUC'}
            value={numero}
            mono
          />
          <DataRow label="Fecha" value={fechaFormateada} />
          <DataRow label="ID"    value={id} />
        </View>

        {/* Card: Datos de la DB */}
        <View style={styles.card}>
          <SectionHeader title="DATOS REGISTRADOS" />
          <DataRow label="ID"       value={persona.id}       />
          <DataRow label="Nombre"   value={persona.nombre}   accent />
          <DataRow label="Apellido" value={persona.apellido} accent />
          <DataRow
            label="Address"
            value={persona.address}
            mono
          />
        </View>

        {/* Botón FIRMAR */}
        <TouchableOpacity
          style={styles.firmarBtn}
          activeOpacity={0.85}
          onPress={() => {
            // Aquí irá la lógica ECDSA en el siguiente paso
          }}
        >
          <Text style={styles.firmarBtnIcon}>🔐</Text>
          <Text style={styles.firmarBtnText}>FIRMAR</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
  },
  backBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, width: 70 },
  backBtnText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  scrollContent: { padding: Spacing.xl, gap: Spacing.lg },

  // Badge autorizado
  authorizedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    alignSelf: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    backgroundColor: Colors.successGlow, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.successDim,
  },
  authorizedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  authorizedText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.semibold },

  // Título
  titleBlock: { alignItems: 'center', gap: Spacing.xs },
  firmarLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.black,
    color: Colors.textMuted, letterSpacing: 4,
  },
  firmarId: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.black,
    color: Colors.accent, letterSpacing: 1,
  },
  firmarName: {
    fontSize: FontSize.xl, fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // Cards
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder,
    gap: Spacing.xs,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.bgBorder },

  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.xs, gap: Spacing.sm },
  dataLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flexShrink: 0, maxWidth: '45%' },
  dataValue: { fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  dataValueAccent: { color: Colors.accent, fontWeight: FontWeight.semibold },
  dataValueMono: { fontFamily: 'monospace', fontSize: FontSize.xs + 1, letterSpacing: 0.3 },

  // Botón FIRMAR
  firmarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.accent,
    borderRadius: Radius.md, paddingVertical: Spacing.md + 4,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  firmarBtnIcon: { fontSize: FontSize.xl },
  firmarBtnText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.bg, letterSpacing: 1.5 },
});

export default FirmarScreen;