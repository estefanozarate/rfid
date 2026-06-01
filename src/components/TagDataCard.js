/**
 * components/TagDataCard.js
 * ──────────────────────────────────────────────────────────
 * Tarjeta que muestra la información técnica de un tag NFC leído.
 *
 * Props:
 *  data {object} — Objeto tagData retornado por useNfcReader.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

// ─── Sub-componente: Fila de dato ──────────────────────────
const DataRow = ({ label, value, accent = false, mono = false }) => {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text
        style={[
          styles.dataValue,
          accent && styles.dataValueAccent,
          mono   && styles.dataValueMono,
        ]}
        selectable
      >
        {String(value)}
      </Text>
    </View>
  );
};

// ─── Sub-componente: Separador de sección ──────────────────
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

// ─── Componente principal ──────────────────────────────────
const TagDataCard = ({ data }) => {
  if (!data) return null;

  const {
    uid, technology, maxSize, isWritable, canMakeReadOnly,
    atqa, sak, ndefRecords, scannedAt,
  } = data;

  // Formatear timestamp
  const formattedTime = scannedAt
    ? new Date(scannedAt).toLocaleTimeString('es-PE', {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <View style={styles.card}>
      {/* Header del tag */}
      <View style={styles.cardHeader}>
        <View style={styles.successDot} />
        <Text style={styles.cardTitle}>Tag Detectado</Text>
        {formattedTime && (
          <Text style={styles.timestamp}>{formattedTime}</Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Sección: Identificación */}
        <SectionHeader title="IDENTIFICACIÓN" />
        <DataRow label="UID / ID del Tag" value={uid}        accent mono />
        <DataRow label="Tecnología"        value={technology}             />

        {/* Sección: Capacidades (si existen) */}
        {(maxSize || isWritable !== null || canMakeReadOnly !== null) && (
          <>
            <SectionHeader title="CAPACIDADES" />
            {maxSize && (
              <DataRow label="Tamaño máximo NDEF" value={`${maxSize} bytes`} />
            )}
            {isWritable !== null && isWritable !== undefined && (
              <DataRow
                label="Escribible"
                value={isWritable ? '✓ Sí' : '✗ No'}
              />
            )}
            {canMakeReadOnly !== null && canMakeReadOnly !== undefined && (
              <DataRow
                label="Puede ser solo lectura"
                value={canMakeReadOnly ? '✓ Sí' : '✗ No'}
              />
            )}
          </>
        )}

        {/* Sección: Datos NFC-A específicos */}
        {(atqa || sak) && (
          <>
            <SectionHeader title="NFC-A" />
            {atqa && <DataRow label="ATQA" value={atqa} mono />}
            {sak  && <DataRow label="SAK"  value={sak}  mono />}
          </>
        )}

        {/* Sección: Registros NDEF */}
        {ndefRecords && ndefRecords.length > 0 && (
          <>
            <SectionHeader title={`NDEF (${ndefRecords.length} registro${ndefRecords.length > 1 ? 's' : ''})`} />
            {ndefRecords.map((rec) => (
              <View key={rec.index} style={styles.ndefRecord}>
                <Text style={styles.ndefIndex}>Registro #{rec.index + 1}</Text>
                <DataRow label="TNF"     value={rec.tnf}     />
                <DataRow label="Tipo"    value={rec.type}    mono />
                <DataRow label="Payload" value={rec.payload} mono />
                {rec.text && (
                  <DataRow label="Texto"   value={rec.text}    accent />
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Estilos ───────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.successDim,
    overflow:        'hidden',
    maxHeight:       380,
    // Glow sutil verde de éxito
    shadowColor:     Colors.success,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.25,
    shadowRadius:    12,
    elevation:       8,
  },
  cardHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgBorder,
    gap: Spacing.xs,
  },
  successDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  cardTitle: {
    flex:       1,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
    color:      Colors.textPrimary,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    fontFamily:'monospace',
  },
  scrollArea: {
    padding: Spacing.md,
  },

  // Sección
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    marginTop:      Spacing.md,
    marginBottom:   Spacing.xs,
    gap:            Spacing.xs,
  },
  sectionTitle: {
    fontSize:      FontSize.xs,
    fontWeight:    FontWeight.bold,
    color:         Colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionLine: {
    flex:            1,
    height:          1,
    backgroundColor: Colors.bgBorder,
  },

  // Filas de datos
  dataRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
    paddingVertical: Spacing.xs,
    gap:             Spacing.sm,
  },
  dataLabel: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    flexShrink: 0,
    maxWidth:   '40%',
  },
  dataValue: {
    fontSize:   FontSize.sm,
    color:      Colors.textPrimary,
    textAlign:  'right',
    flex:       1,
  },
  dataValueAccent: {
    color:      Colors.success,
    fontWeight: FontWeight.semibold,
  },
  dataValueMono: {
    fontFamily: 'monospace',
    fontSize:   FontSize.xs + 1,
    letterSpacing: 0.5,
  },

  // Registros NDEF
  ndefRecord: {
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.sm,
    padding:         Spacing.sm,
    marginBottom:    Spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
  ndefIndex: {
    fontSize:      FontSize.xs,
    fontWeight:    FontWeight.bold,
    color:         Colors.textAccent,
    letterSpacing: 0.5,
    marginBottom:  Spacing.xs,
  },
});

export default TagDataCard;
