/**
 * screens/NuevoSelloScreen.js
 * Flujo: Escanear QR/Barcode → Firmar → Sheet NFC → Guardar
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { parseTrama } from '../utils/tramaParser';
import { signPayload, hasWallet } from '../services/walletService';
import { useNfcWriter } from '../hooks/useNfcWriter';
import NfcSheet from '../components/NfcSheet';
import { insertSello } from '../db/sellosRepository';

const STEP_SCAN  = 'scan';
const STEP_SIGN  = 'sign';
const STEP_NFC   = 'nfc';
const STEP_DONE  = 'done';

const StepBar = ({ step }) => {
  const steps = [STEP_SCAN, STEP_SIGN, STEP_NFC, STEP_DONE];
  const labels = ['Escanear', 'Firmar', 'NFC', 'Listo'];
  const idx = steps.indexOf(step);
  return (
    <View style={styles.stepBar}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, i <= idx && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, i <= idx && styles.stepDotTextActive]}>
                {i < idx ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i <= idx && styles.stepLabelActive]}>{labels[i]}</Text>
          </View>
          {i < steps.length - 1 && <View style={[styles.stepLine, i < idx && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const DataRow = ({ label, value }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={styles.dataValue} numberOfLines={1}>{String(value || '—')}</Text>
  </View>
);

const NuevoSelloScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [step,       setStep]     = useState(STEP_SCAN);
  const [scanned,    setScanned]  = useState(false);
  const [parsed,     setParsed]   = useState(null);
  const [firmaHex,   setFirmaHex] = useState(null);
  const [signing,    setSigning]  = useState(false);
  const [signError,  setSignError]= useState(null);
  const [nfcSheet,   setNfcSheet] = useState(false);
  const [nfcStatus,  setNfcStatus]= useState('waiting');
  const [nfcMsg,     setNfcMsg]   = useState(null);

  const { writeTag } = useNfcWriter();

  React.useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ── Paso 1: Escanear ──────────────────────────────────────
  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) {
      setScanned(false);
      return;
    }
    setParsed(result);
    setStep(STEP_SIGN);
  };

  // ── Paso 2: Firmar ────────────────────────────────────────
  const handleSign = async () => {
    setSigning(true);
    setSignError(null);
    try {
      const ok = await hasWallet();
      if (!ok) throw new Error('No tienes wallet. Créala desde Inicio.');
      const firma = await signPayload(parsed.raw);
      setFirmaHex(firma);
      setStep(STEP_NFC);
    } catch (e) {
      setSignError(e.message);
    } finally { setSigning(false); }
  };

  // ── Paso 3: Escribir NFC ──────────────────────────────────
  const handleWriteNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg(null);

    // El payload que se graba en el tag = firma hex
    const result = await writeTag(firmaHex);

    if (result.success) {
      setNfcStatus('success');
      setNfcMsg('Documento sellado correctamente');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Guardar en SQLite
      insertSello({
        trama:       parsed.raw,
        doc_id:      parsed.docId,
        firmante_id: parsed.id,
        tipo_doc:    parsed.tipo === '1' ? 'DNI' : 'RUC',
        num_id:      parsed.numero,
        fecha_venc:  parsed.fecha,
        texto_libre: parsed.textoLibre,
        firma_hex:   firmaHex,
        nfc_uid:     result.uid,
      });
    } else {
      setNfcStatus('error');
      setNfcMsg(result.error || 'Error al escribir el tag');
    }
  };

  const handleSheetClose = () => {
    setNfcSheet(false);
    if (nfcStatus === 'success') {
      setStep(STEP_DONE);
    }
  };

  // ── Paso 4: Listo ─────────────────────────────────────────
  const handleDone = () => navigation.goBack();

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo sello</Text>
        <View style={{ width: 70 }} />
      </View>

      <StepBar step={step} />

      {/* PASO 1: Cámara */}
      {step === STEP_SCAN && (
        <View style={styles.cameraContainer}>
          {permission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr','code128','code39','ean13'] }}
                onBarcodeScanned={handleScan}
              />
              <View style={styles.overlay}>
                <View style={styles.overlayTop} />
                <View style={styles.overlayMid}>
                  <View style={styles.overlaySide} />
                  <View style={styles.frame}>
                    {[['TL','tl'],['TR','tr'],['BL','bl'],['BR','br']].map(([,pos]) => (
                      <View key={pos} style={[styles.corner, styles[pos]]} />
                    ))}
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                  <Text style={styles.scanHint}>Apunta al QR o código de barras</Text>
                  <Text style={styles.scanSub}>QR · Code128 · Code39 · EAN</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.permText}>Se requiere acceso a la cámara</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Conceder permiso</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* PASO 2: Confirmar y firmar */}
      {step === STEP_SIGN && parsed && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del documento</Text>
            <DataRow label="Tipo"       value={parsed.tipo === '1' ? 'DNI' : 'RUC'} />
            <DataRow label="Número"     value={parsed.numero} />
            <DataRow label="Vencimiento" value={parsed.fecha} />
            <DataRow label="ID firmante" value={parsed.id} />
            <DataRow label="Doc ID"     value={parsed.docId} />
            {parsed.textoLibre ? <DataRow label="Texto libre" value={parsed.textoLibre} /> : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trama</Text>
            <Text style={styles.tramaText}>{parsed.raw}</Text>
          </View>
          {signError && <View style={styles.errorBox}><Text style={styles.errorText}>{signError}</Text></View>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSign} disabled={signing}>
            {signing
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={styles.primaryBtnText}>🔐 Firmar con mi wallet</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 3: Escribir NFC */}
      {step === STEP_NFC && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Firma generada</Text>
            <Text style={styles.firmaText} numberOfLines={3}>{firmaHex}</Text>
          </View>
          <View style={styles.nfcCard}>
            <Text style={{ fontSize: 40 }}>📡</Text>
            <Text style={styles.nfcCardTitle}>Listo para sellar</Text>
            <Text style={styles.nfcCardSub}>
              Toca el botón y acerca el tag NFC para grabar la firma
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleWriteNfc}>
            <Text style={styles.primaryBtnText}>📡 Escribir en tag NFC</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 4: Listo */}
      {step === STEP_DONE && (
        <View style={styles.doneContainer}>
          <View style={styles.doneCircle}>
            <Text style={styles.doneIcon}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>¡Documento sellado!</Text>
          <Text style={styles.doneSub}>La firma fue escrita en el tag NFC correctamente.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleDone}>
            <Text style={styles.primaryBtnText}>Ver mis sellos</Text>
          </TouchableOpacity>
        </View>
      )}

      <NfcSheet
        visible={nfcSheet}
        mode="write"
        status={nfcStatus}
        message={nfcMsg}
        onCancel={handleSheetClose}
      />
    </SafeAreaView>
  );
};

const FRAME = 240;
const CW    = 24;
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  backBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, width: 70 },
  backText:{ fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },

  // Step bar
  stepBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  stepItem:{ alignItems: 'center', gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.bgSurface, borderWidth: 1.5, borderColor: Colors.bgBorder, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:   { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepDotText:     { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.bold },
  stepDotTextActive:{ color: Colors.bg },
  stepLabel:       { fontSize: 9, color: Colors.textMuted, letterSpacing: 0.3 },
  stepLabelActive: { color: Colors.accent },
  stepLine:        { flex: 1, height: 1.5, backgroundColor: Colors.bgBorder, marginBottom: 14 },
  stepLineActive:  { backgroundColor: Colors.accent },

  // Camera
  cameraContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMid:    { flexDirection: 'row', height: FRAME },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: Spacing.xl, gap: 6 },
  scanHint: { fontSize: FontSize.md, color: 'white', textAlign: 'center' },
  scanSub:  { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' },
  frame: { width: FRAME, height: FRAME, position: 'relative' },
  corner: { position: 'absolute', width: CW, height: CW, borderColor: Colors.accent, borderWidth: 0 },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  // Content
  scroll:   { flex: 1 },
  content:  { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card:     { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.xs },
  cardTitle:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  dataRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dataLabel:{ fontSize: FontSize.sm, color: Colors.textSecondary },
  dataValue:{ fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  tramaText:{ fontSize: FontSize.xs, color: Colors.accent, fontFamily: 'monospace', lineHeight: 18 },
  firmaText:{ fontSize: 9, color: Colors.textSecondary, fontFamily: 'monospace', lineHeight: 16, letterSpacing: 0.3 },
  errorBox: { backgroundColor: Colors.errorGlow, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.errorDim },
  errorText:{ fontSize: FontSize.sm, color: Colors.error },
  nfcCard:  { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.bgBorder, alignItems: 'center', gap: Spacing.sm },
  nfcCardTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  nfcCardSub:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  permText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  permBtn:  { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.accent, borderRadius: Radius.md },
  permBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.bg },

  primaryBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  primaryBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.bg },

  // Done
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  doneCircle:    { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.successGlow, borderWidth: 2, borderColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  doneIcon:      { fontSize: 48, color: Colors.success, fontWeight: FontWeight.black },
  doneTitle:     { fontSize: FontSize.xxl, fontWeight: FontWeight.black, color: Colors.success },
  doneSub:       { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});

export default NuevoSelloScreen;
