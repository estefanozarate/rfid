/**
 * components/ScreenHeader.js
 * Header reutilizable con botón volver sin ancho fijo.
 * Opcional: barra de pasos.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Spacing, FontWeight } from '../theme';
import { RFontSize, rs } from '../utils/responsive';
import Icon from './Icon';

// ── Barra de pasos ────────────────────────────────────────
export const StepBar = ({ steps, currentStep, theme }) => {
  const idx = steps.indexOf(currentStep);
  return (
    <View style={[stepSt.bar, { borderBottomColor: theme.bgBorder }]}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <View style={stepSt.item}>
            <View style={[stepSt.dot, {
              backgroundColor: i <= idx ? theme.accent : theme.bgCard,
              borderColor:     i <= idx ? theme.accent : theme.bgBorder2,
            }]}>
              <Text style={[stepSt.dotTxt, { color: i <= idx ? '#fff' : theme.textMuted, fontSize: RFontSize.xs - 1 }]}>
                {i < idx ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[stepSt.label, {
              color:      i <= idx ? theme.accent : theme.textMuted,
              fontSize:   RFontSize.xs - 1,
              fontWeight: i === idx ? FontWeight.bold : FontWeight.regular,
            }]}>
              {s}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[stepSt.line, { backgroundColor: i < idx ? theme.accent : theme.bgBorder }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const stepSt = StyleSheet.create({
  bar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(Spacing.md), paddingVertical: rs(Spacing.sm + 2), borderBottomWidth: 1 },
  item:  { alignItems: 'center', gap: rs(3) },
  dot:   { width: rs(26), height: rs(26), borderRadius: rs(13), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dotTxt:{ fontWeight: FontWeight.bold },
  label: { letterSpacing: 0.2 },
  line:  { flex: 1, height: 1.5, marginBottom: rs(16) },
});

// ── Header principal ──────────────────────────────────────
const ScreenHeader = ({ title, onBack, theme, rightElement }) => (
  <View style={[hSt.header, {
    backgroundColor:  theme.bgSurface,
    borderBottomColor: theme.bgBorder,
  }]}>
    {/* Botón volver — sin ancho fijo, usa minWidth */}
    <TouchableOpacity style={hSt.backBtn} onPress={onBack} hitSlop={{ top:12, bottom:12, left:12, right:12 }}>
      <Icon name="back" size={RFontSize.xl} color={theme.accent} />
      <Text style={[hSt.backTxt, { color: theme.accent, fontSize: RFontSize.sm }]} numberOfLines={1}>
        Volver
      </Text>
    </TouchableOpacity>

    {/* Título centrado */}
    <Text style={[hSt.title, { color: theme.textPrimary, fontSize: RFontSize.lg }]} numberOfLines={1}>
      {title}
    </Text>

    {/* Elemento derecho (opcional, para balancear) */}
    <View style={hSt.right}>
      {rightElement || null}
    </View>
  </View>
);

const hSt = StyleSheet.create({
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(Spacing.md), paddingVertical: rs(Spacing.sm + 2), borderBottomWidth: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(4), minWidth: rs(60), flexShrink: 0 },
  backTxt: { fontWeight: FontWeight.medium },
  title:   { flex: 1, textAlign: 'center', fontWeight: FontWeight.bold },
  right:   { minWidth: rs(60), alignItems: 'flex-end' },
});

export default ScreenHeader;
