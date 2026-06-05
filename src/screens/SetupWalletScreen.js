/**
 * screens/SetupWalletScreen.js
 * Aparece la primera vez si no hay wallet.
 * Genera keypair ECDSA y registra en el backend.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { generateWallet, registerWalletOnServer } from '../services/walletService';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;

const SetupWalletScreen = ({ navigation }) => {
  const [label,    setLabel]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [step,     setStep]     = useState('form'); // form | creating | done

  const handleCreate = async () => {
    if (!label.trim()) { setError('Ingresa tu nombre para identificarte en la lista blanca.'); return; }
    setLoading(true);
    setError(null);
    setStep('creating');

    try {
      const wallet = await generateWallet();
      try {
        await registerWalletOnServer(label.trim());
      } catch (regErr) {
        // Si falla el registro remoto no bloqueamos — igual puede funcionar offline
        console.warn('[SetupWallet] registro remoto falló:', regErr.message);
      }
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => navigation.replace('Main');

  const cardW = isTablet ? Math.min(480, width * 0.6) : '100%';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { width: cardW }]}>

          {/* Ícono */}
          <View style={styles.iconBox}>
            <View style={styles.ring3} />
            <View style={styles.ring2} />
            <View style={styles.ring1} />
            <View style={styles.dot} />
          </View>

          {step === 'form' && (
            <>
              <Text style={styles.title}>Bienvenido</Text>
              <Text style={styles.sub}>
                Para usar la app necesitas una wallet ECDSA.{'\n'}
                Tu clave privada se guarda solo en este dispositivo.
              </Text>

              <Text style={styles.inputLabel}>Tu nombre (para la lista blanca)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor={Colors.textMuted}
                value={label}
                onChangeText={setLabel}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btn, (!label.trim() || loading) && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={!label.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color={Colors.bg} />
                  : <Text style={styles.btnText}>Crear mi wallet</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {step === 'creating' && (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.sub}>Generando tu keypair ECDSA…</Text>
            </View>
          )}

          {step === 'done' && (
            <>
              <Text style={[styles.title, { color: Colors.success }]}>Wallet creada</Text>
              <Text style={styles.sub}>
                Tu identidad criptográfica está lista.{'\n'}
                Ya puedes sellar y validar documentos.
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: Colors.success }]} onPress={handleContinue}>
                <Text style={styles.btnText}>Empezar →</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  kav:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card:    { backgroundColor: Colors.bgSurface, borderRadius: Radius.xl, padding: isTablet ? Spacing.xxl : Spacing.xl, borderWidth: 1, borderColor: Colors.bgBorder, alignItems: 'center', gap: Spacing.md },
  centered:{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },

  // NFC icon
  iconBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  ring3:   { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: Colors.accent, opacity: 0.2 },
  ring2:   { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: Colors.accent, opacity: 0.4 },
  ring1:   { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: Colors.accent, opacity: 0.7 },
  dot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent },

  title:      { fontSize: isTablet ? FontSize.xxl : FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center' },
  sub:        { fontSize: isTablet ? FontSize.md : FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  inputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.5, alignSelf: 'flex-start' },
  input:      { width: '100%', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, fontSize: isTablet ? FontSize.lg : FontSize.md, color: Colors.textPrimary },
  errorText:  { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
  btn:        { width: '100%', backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  btnDisabled:{ opacity: 0.45 },
  btnText:    { fontSize: isTablet ? FontSize.lg : FontSize.md, fontWeight: FontWeight.bold, color: Colors.bg },
});

export default SetupWalletScreen;
