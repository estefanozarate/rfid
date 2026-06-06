import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNfcWriter } from '../hooks/useNfcWriter';
import ScanRing from '../components/ScanRing';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

// ─── Tab selector ─────────────────────────────────────────
const TabBar = ({ active, onChange }) => (
  <View style={styles.tabBar}>
    <TouchableOpacity
      style={[styles.tab, active === 'url' && styles.tabActive]}
      onPress={() => onChange('url')}
    >
      <Text style={[styles.tabText, active === 'url' && styles.tabTextActive]}>🔗 URL</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tab, active === 'text' && styles.tabActive]}
      onPress={() => onChange('text')}
    >
      <Text style={[styles.tabText, active === 'text' && styles.tabTextActive]}>📝 Texto</Text>
    </TouchableOpacity>
  </View>
);

const NfcWriteScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('url');
  const [urlInput,  setUrlInput]  = useState('');
  const [textInput, setTextInput] = useState('');

  const {
    isSupported, isWriting, success, error,
    checkNfcSupport, writeUrl, writeText, cancelWrite, reset,
  } = useNfcWriter();

  useEffect(() => {
    checkNfcSupport();
    return () => { cancelWrite(); };
  }, []);

  const handleWrite = useCallback(() => {
    reset();
    if (activeTab === 'url') {
      writeUrl(urlInput);
    } else {
      writeText(textInput);
    }
  }, [activeTab, urlInput, textInput, writeUrl, writeText, reset]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    reset();
  };

  const currentInput = activeTab === 'url' ? urlInput : textInput;
  const hasInput     = currentInput.trim().length > 0;

  const ringColor = isWriting ? Colors.accent : success ? Colors.success : Colors.bgBorder;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { cancelWrite(); navigation.goBack(); }}
        >
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sellar tarjeta</Text>
        <View style={styles.headerRight}>
          <View style={[styles.nfcDot, { backgroundColor: isSupported ? Colors.success : Colors.error }]} />
          <Text style={styles.headerSub}>{isSupported ? 'NFC activo' : 'Sin NFC'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Anillo animado */}
          <View style={styles.ringSection}>
            <ScanRing active={isWriting} size={110} color={ringColor} />
            <View style={[styles.ringCenter, { borderColor: ringColor }]}>
              {isWriting ? (
                <ActivityIndicator size="large" color={Colors.accent} />
              ) : success ? (
                <Text style={styles.ringCenterIcon}>✓</Text>
              ) : (
                <Text style={styles.ringCenterIcon}>✍️</Text>
              )}
            </View>
          </View>

          {/* Estado */}
          <View style={styles.statusBlock}>
            <Text style={[styles.statusText, {
              color: isWriting ? Colors.accent : success ? Colors.success : error ? Colors.error : Colors.textMuted
            }]}>
              {isWriting ? 'Esperando tarjeta...' :
               success   ? 'Escrito correctamente' :
               error     ? 'Error al escribir' :
               'Listo para escribir'}
            </Text>
            {isWriting && (
              <Text style={styles.statusHint}>Acerca la tarjeta NFC a la parte trasera del teléfono</Text>
            )}
          </View>

          {/* Mensaje de éxito */}
          {success && (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>¡Tarjeta sellada!</Text>
              <Text style={styles.successText}>
                El contenido fue escrito correctamente en la tarjeta NFC.
              </Text>
              <TouchableOpacity style={styles.successBtn} onPress={() => { reset(); }}>
                <Text style={styles.successBtnText}>Escribir en otra tarjeta</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error */}
          {error && !success && (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>✕</Text>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Tabs y formulario */}
          {!success && (
            <View style={styles.formContainer}>
              <TabBar active={activeTab} onChange={handleTabChange} />

              {activeTab === 'url' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>URL a escribir</Text>
                  <TextInput
                    style={styles.input}
                    value={urlInput}
                    onChangeText={setUrlInput}
                    placeholder="https://stamping.io/evento/123"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!isWriting}
                  />
                  <Text style={styles.inputHint}>
                    La URL será almacenada como registro NDEF URI. Cualquier teléfono podrá leerla.
                  </Text>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Texto a escribir</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={textInput}
                    onChangeText={setTextInput}
                    placeholder="user_id:12345|event:stamping2026"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={4}
                    editable={!isWriting}
                  />
                  <Text style={styles.inputHint}>
                    El texto será almacenado como registro NDEF Text. Máximo ~130 caracteres en tags NTAG213.
                  </Text>
                  {textInput.length > 0 && (
                    <Text style={[styles.charCount, textInput.length > 130 && { color: Colors.error }]}>
                      {textInput.length} / 130 caracteres
                    </Text>
                  )}
                </View>
              )}

              {/* Botón WRITE */}
              <TouchableOpacity
                style={[
                  styles.writeBtn,
                  (!hasInput || isWriting || !isSupported) && styles.writeBtnDisabled,
                ]}
                onPress={handleWrite}
                disabled={!hasInput || isWriting || !isSupported}
                activeOpacity={0.85}
              >
                {isWriting ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.bg} />
                    <Text style={styles.writeBtnText}>Esperando...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.writeBtnIcon}>✍️</Text>
                    <Text style={styles.writeBtnText}>WRITE</Text>
                  </>
                )}
              </TouchableOpacity>

              {isWriting && (
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelWrite}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:Colors.bg },

  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm+4, borderBottomWidth:1, borderBottomColor:Colors.bgBorder },
  backBtn: { paddingVertical:Spacing.xs, paddingHorizontal:Spacing.sm, width:70 },
  backBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  headerTitle: { flex:1, textAlign:'center', fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.textPrimary },
  headerRight: { flexDirection:'row', alignItems:'center', gap:Spacing.xs, width:70, justifyContent:'flex-end' },
  nfcDot: { width:7, height:7, borderRadius:4 },
  headerSub: { fontSize:FontSize.xs, color:Colors.textMuted },

  scrollContent: { paddingHorizontal:Spacing.md, paddingTop:Spacing.xl, alignItems:'center', gap:Spacing.lg },

  // Anillo
  ringSection: { width:260, height:260, alignItems:'center', justifyContent:'center' },
  ringCenter: { position:'absolute', width:80, height:80, borderRadius:40, borderWidth:1.5, alignItems:'center', justifyContent:'center', backgroundColor:Colors.bgSurface },
  ringCenterIcon: { fontSize:28 },

  // Estado
  statusBlock: { alignItems:'center', gap:Spacing.xs },
  statusText: { fontSize:FontSize.xl, fontWeight:FontWeight.semibold },
  statusHint: { fontSize:FontSize.sm, color:Colors.textSecondary, textAlign:'center', maxWidth:280 },

  // Éxito
  successCard: { width:'100%', backgroundColor:Colors.successGlow, borderRadius:Radius.lg, padding:Spacing.lg, borderWidth:1, borderColor:Colors.successDim, alignItems:'center', gap:Spacing.sm },
  successIcon: { fontSize:40 },
  successTitle: { fontSize:FontSize.xl, fontWeight:FontWeight.bold, color:Colors.success },
  successText: { fontSize:FontSize.sm, color:Colors.textSecondary, textAlign:'center' },
  successBtn: { marginTop:Spacing.sm, paddingVertical:Spacing.sm+2, paddingHorizontal:Spacing.lg, backgroundColor:Colors.bgSurface, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.bgBorder },
  successBtnText: { fontSize:FontSize.sm, color:Colors.textPrimary, fontWeight:FontWeight.medium },

  // Error
  errorCard: { width:'100%', backgroundColor:Colors.errorGlow, borderRadius:Radius.md, padding:Spacing.md, borderWidth:1, borderColor:Colors.errorDim, alignItems:'center', gap:Spacing.xs },
  errorIcon: { fontSize:20, color:Colors.error },
  errorTitle: { fontSize:FontSize.md, fontWeight:FontWeight.semibold, color:Colors.error },
  errorText: { fontSize:FontSize.sm, color:Colors.textSecondary, textAlign:'center' },

  // Formulario
  formContainer: { width:'100%', gap:Spacing.md },

  // Tabs
  tabBar: { flexDirection:'row', backgroundColor:Colors.bgSurface, borderRadius:Radius.md, padding:4, borderWidth:1, borderColor:Colors.bgBorder },
  tab: { flex:1, paddingVertical:Spacing.sm, alignItems:'center', borderRadius:Radius.sm-2 },
  tabActive: { backgroundColor:Colors.bgCard, borderWidth:1, borderColor:Colors.bgBorder },
  tabText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  tabTextActive: { color:Colors.textPrimary, fontWeight:FontWeight.semibold },

  // Input
  inputGroup: { gap:Spacing.xs },
  inputLabel: { fontSize:FontSize.sm, fontWeight:FontWeight.semibold, color:Colors.textSecondary, letterSpacing:0.5 },
  input: { backgroundColor:Colors.bgSurface, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.bgBorder, paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm+4, fontSize:FontSize.md, color:Colors.textPrimary },
  inputMultiline: { height:100, textAlignVertical:'top', paddingTop:Spacing.sm+4 },
  inputHint: { fontSize:FontSize.xs, color:Colors.textMuted, lineHeight:FontSize.xs*1.6 },
  charCount: { fontSize:FontSize.xs, color:Colors.textMuted, textAlign:'right' },

  // Botón WRITE
  writeBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, backgroundColor:Colors.success, borderRadius:Radius.md, paddingVertical:Spacing.md+2, shadowColor:Colors.success, shadowOffset:{width:0,height:4}, shadowOpacity:0.35, shadowRadius:10, elevation:6 },
  writeBtnDisabled: { backgroundColor:Colors.bgSurface, borderWidth:1, borderColor:Colors.bgBorder, shadowOpacity:0, elevation:0 },
  writeBtnIcon: { fontSize:FontSize.lg },
  writeBtnText: { fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.bg, letterSpacing:1 },

  // Cancelar
  cancelBtn: { paddingVertical:Spacing.sm+4, alignItems:'center', backgroundColor:Colors.bgSurface, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.bgBorder },
  cancelBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
});

export default NfcWriteScreen;