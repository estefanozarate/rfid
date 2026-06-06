import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { RFontSize, rs } from '../utils/responsive';
import { generateWallet } from '../services/walletService';

const { width } = Dimensions.get('window');
const PANEL_W   = Math.min(width - rs(Spacing.xl) * 2, 460);

const SetupWalletScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [label,   setLabel]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleContinue = async () => {
    if (!label.trim()) { setError('Ingresa tu nombre para identificarte.'); return; }
    setLoading(true); setError('');
    try {
      await generateWallet();
      // Ir a setup de PIN pasando el label
      navigation.replace('SetupPin', { label: label.trim() });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(Spacing.xl) }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, {
          width: PANEL_W,
          backgroundColor: theme.bgCard,
          borderColor: theme.bgBorder,
        }]}>

          {/* Icono */}
          <View style={[styles.iconRings, { borderColor: theme.bgBorder2 }]}>
            <View style={[styles.iconRing2, { borderColor: theme.accentGlow.replace('0.15','0.4') }]} />
            <View style={[styles.iconDot,  { backgroundColor: theme.accent }]} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary, fontSize: RFontSize.xxl }]}>
            Bienvenido
          </Text>
          <Text style={[styles.sub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
            Vamos a crear tu wallet ECDSA.{'\n'}
            Tu clave privada solo vive en este dispositivo.
          </Text>

          <View style={{ width: '100%', gap: rs(Spacing.xs) }}>
            <Text style={[styles.inputLabel, { color: theme.textMuted, fontSize: RFontSize.xs }]}>
              TU NOMBRE
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.bg,
                borderColor: theme.bgBorder2,
                color: theme.textPrimary,
                fontSize: RFontSize.md,
              }]}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor={theme.textMuted}
              value={label}
              onChangeText={setLabel}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? (
            <Text style={[styles.errTxt, { color: theme.error, fontSize: RFontSize.sm }]}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: label.trim() ? theme.accent : theme.bgBorder2 }]}
            onPress={handleContinue}
            disabled={loading || !label.trim()}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={[styles.btnTxt, { fontSize: RFontSize.md }]}>Continuar →</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card:       { borderRadius: Radius.xl, padding: rs(Spacing.xl), borderWidth: 1, alignItems: 'center', gap: rs(Spacing.lg) },
  iconRings:  { width: rs(80), height: rs(80), borderRadius: rs(40), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconRing2:  { position: 'absolute', width: rs(56), height: rs(56), borderRadius: rs(28), borderWidth: 1.5 },
  iconDot:    { width: rs(18), height: rs(18), borderRadius: rs(9) },
  title:      { fontWeight: FontWeight.black },
  sub:        { textAlign: 'center', lineHeight: rs(22) },
  inputLabel: { fontWeight: FontWeight.bold, letterSpacing: 1 },
  input:      { width: '100%', borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: rs(Spacing.md), paddingVertical: rs(Spacing.sm + 2) },
  errTxt:     { textAlign: 'center' },
  btn:        { width: '100%', borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center' },
  btnTxt:     { color: '#fff', fontWeight: FontWeight.bold },
});

export default SetupWalletScreen;
