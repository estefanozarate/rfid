import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNfcReader } from '../hooks/useNfcReader';
import ScanRing from '../components/ScanRing';
import TagDataCard from '../components/TagDataCard';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

const NoNfcBanner = () => (
  <View style={styles.noBanner}>
    <Text style={styles.noBannerIcon}>⚠️</Text>
    <Text style={styles.noBannerTitle}>NFC no disponible</Text>
    <Text style={styles.noBannerText}>
      Este dispositivo no tiene hardware NFC o está desactivado en los ajustes del sistema.
    </Text>
    {Platform.OS === 'android' && (
      <Text style={styles.noBannerHint}>
        Verifica: Ajustes → Conexiones → NFC y pagos sin contacto
      </Text>
    )}
  </View>
);

const ErrorBanner = ({ message, onRetry }) => (
  <View style={styles.errorBanner}>
    <Text style={styles.errorIcon}>✕</Text>
    <Text style={styles.errorTitle}>Error de lectura</Text>
    <Text style={styles.errorText}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Reintentar</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ScannerScreen = ({ navigation }) => {
  const {
    isSupported, isScanning, tagData, error,
    checkNfcSupport, startScan, cancelScan, reset,
  } = useNfcReader();

  // Montar: verificar NFC + arrancar escaneo UNA sola vez
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const supported = await checkNfcSupport();
      if (supported && mounted) startScan();
    };
    init();
    // Cleanup al desmontar — libera la antena NFC
    return () => {
      mounted = false;
      cancelScan();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // FIX: el useEffect de re-focus fue ELIMINADO.
  // Causaba un loop infinito: focus → startScan() → isScanning cambia
  // → deps cambian → efecto se re-ejecuta → startScan() de nuevo → crash.
  // El usuario controla los re-escaneos con el botón.

  const handleMainButton = useCallback(() => {
    if (isScanning) {
      cancelScan();
    } else {
      reset();
      startScan();
    }
  }, [isScanning, cancelScan, reset, startScan]);

  const handleNewScan = useCallback(() => {
    reset();
    startScan();
  }, [reset, startScan]);

  const getStatusText = () => {
    if (isSupported === null) return 'Inicializando NFC...';
    if (!isSupported)         return 'NFC no soportado';
    if (isScanning)           return 'Buscando tag...';
    if (tagData)              return 'Tag leído correctamente';
    if (error)                return 'Escaneo fallido';
    return 'Listo para escanear';
  };

  const getStatusColor = () => {
    if (!isSupported) return Colors.error;
    if (isScanning)   return Colors.accent;
    if (tagData)      return Colors.success;
    if (error)        return Colors.error;
    return Colors.textMuted;
  };

  const ringColor = isScanning ? Colors.accent : tagData ? Colors.success : Colors.bgBorder;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { cancelScan(); navigation.goBack(); }}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lector RFID</Text>
        <View style={styles.headerRight}>
          <View style={[styles.nfcIndicator, { backgroundColor: isSupported ? Colors.success : Colors.error }]} />
          <Text style={styles.headerSubtitle}>{isSupported ? 'NFC activo' : 'Sin NFC'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.ringSection}>
          <ScanRing active={isScanning} size={130} color={ringColor} />
          <View style={[styles.ringCenter, { borderColor: ringColor }]}>
            {isScanning ? (
              <ActivityIndicator size="large" color={Colors.accent} />
            ) : tagData ? (
              <Text style={styles.ringCenterIcon}>✓</Text>
            ) : (
              <Text style={styles.ringCenterIcon}>📡</Text>
            )}
          </View>
        </View>

        <View style={styles.statusBlock}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {isScanning && (
            <Text style={styles.statusHint}>
              Acerca el tag RFID a la parte trasera del teléfono
            </Text>
          )}
        </View>

        <View style={styles.body}>
          {isSupported === false && <NoNfcBanner />}

          {isSupported !== false && error && !tagData && (
            <ErrorBanner message={error} onRetry={isSupported ? handleNewScan : undefined} />
          )}

          {tagData && <TagDataCard data={tagData} />}

          {!tagData && !error && isSupported && !isScanning && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Instrucciones</Text>
              <Text style={styles.instructionsText}>
                {'1. Presiona '}
                <Text style={styles.instructionsHighlight}>Escanear</Text>
                {' para activar el lector.\n'}
                {'2. Acerca un tag RFID/NFC a la parte trasera del teléfono.\n'}
                {'3. Mantén el tag quieto hasta que se complete la lectura.\n'}
                {'4. Los datos del tag aparecerán automáticamente.'}
              </Text>
            </View>
          )}
        </View>

        {isSupported !== false && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.mainBtn, isScanning && styles.mainBtnCancel]}
              onPress={handleMainButton}
              disabled={isSupported === null}
              accessibilityRole="button"
              accessibilityLabel={isScanning ? 'Cancelar escaneo' : 'Iniciar escaneo'}
            >
              <Text style={[styles.mainBtnText, isScanning && styles.mainBtnTextCancel]}>
                {isScanning ? 'Cancelar' : 'Escanear'}
              </Text>
            </TouchableOpacity>

            {tagData && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleNewScan} accessibilityRole="button">
                <Text style={styles.secondaryBtnText}>+ Nuevo escaneo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
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
  backBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  backBtnText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  nfcIndicator: { width: 7, height: 7, borderRadius: 4 },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xl, alignItems: 'center', gap: Spacing.lg },
  ringSection: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgSurface },
  ringCenterIcon: { fontSize: 32 },
  statusBlock: { alignItems: 'center', gap: Spacing.xs },
  statusText: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, letterSpacing: 0.2 },
  statusHint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', maxWidth: 280 },
  body: { width: '100%' },
  instructionsCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.sm },
  instructionsTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  instructionsText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: FontSize.sm * 1.8 },
  instructionsHighlight: { color: Colors.accent, fontWeight: FontWeight.semibold },
  noBanner: { backgroundColor: Colors.errorGlow, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.errorDim, alignItems: 'center', gap: Spacing.sm },
  noBannerIcon: { fontSize: 36 },
  noBannerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.error },
  noBannerText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: FontSize.sm * 1.6 },
  noBannerHint: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', fontFamily: 'monospace' },
  errorBanner: { backgroundColor: Colors.errorGlow, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.errorDim, alignItems: 'center', gap: Spacing.sm },
  errorIcon: { fontSize: 20, color: Colors.error, fontWeight: FontWeight.black },
  errorTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.error },
  errorText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md, backgroundColor: Colors.bgSurface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.bgBorder, marginTop: Spacing.xs },
  retryBtnText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  actionsContainer: { width: '100%', gap: Spacing.sm, marginTop: Spacing.sm },
  mainBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  mainBtnCancel: { backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.bgBorder, shadowOpacity: 0, elevation: 0 },
  mainBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.bg, letterSpacing: 0.3 },
  mainBtnTextCancel: { color: Colors.textSecondary },
  secondaryBtn: { backgroundColor: Colors.bgSurface, borderRadius: Radius.md, paddingVertical: Spacing.sm + 4, alignItems: 'center', borderWidth: 1, borderColor: Colors.bgBorder },
  secondaryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textSecondary },
});

export default ScannerScreen;