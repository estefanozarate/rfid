/**
 * screens/NuevaValidacionScreen.js
 * Flujo: Escanear QR → Leer tag NFC → Verificar firma → Guardar
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';
import { parseTrama } from '../utils/tramaParser';
import { verifySignature } from '../services/walletService';
import { useNfcNdefReader } from '../hooks/useNfcNdefReader';
import NfcSheet from '../components/NfcSheet';
import { insertValidacion } from '../db/validacionesRepository';
import { getWhitelistByAddress, getWhitelist } from '../db/whitelistRepository';

const STEP_SCAN   = 'scan';
const STEP_NFC    = 'nfc';
const STEP_RESULT = 'result';

const DataRow = ({ label, value, accent }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={[styles.dataValue, accent && { color: Colors.accent }]} numberOfLines={1}>
      {String(value || '—')}
    </Text>
  </View>
);

const NuevaValidacionScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [step,      setStep]      = useState(STEP_SCAN);
  const [scanned,   setScanned]   = useState(false);
  const [parsed,    setParsed]    = useState(null);
  const [nfcSheet,  setNfcSheet]  = useState(false);
  const [nfcStatus, setNfcStatus] = useState('waiting');
  const [nfcMsg,    setNfcMsg]    = useState(null);
  const [resultado, setResultado] = useState(null); // { valido, firmante, address, detalle }

  const { readTag } = useNfcNdefReader();

  React.useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ── Paso 1: Escanear QR ───────────────────────────────────
  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); return; }
    setParsed(result);
    setStep(STEP_NFC);
  };

  // ── Paso 2: Leer NFC ──────────────────────────────────────
  const handleReadNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg(null);

    const result = await readTag();

    if (!result.success) {
      setNfcStatus('error');
      setNfcMsg(result.error || 'No se pudo leer el tag');
      return;
    }

    // result.text = firma hex grabada al sellar
    const firmaHex = result.text;

    // Verificar contra toda la whitelist local
    const whitelist = getWhitelist();
    let verified    = false;
    let signer      = null;

    for (const w of whitelist) {
      if (verifySignature(parsed.raw, firmaHex, w.address)) {
        verified = true;
        signer   = w;
        break;
      }
    }

    const res = {
      valido:    verified,
      firmante:  signer,
      address:   signer?.address || null,
      firmaHex,
      nfcUid:    result.uid,
      detalle:   verified
        ? `Firmado por: ${signer.label} (${signer.address.slice(0,10)}...)`
        : 'La firma no corresponde a ningún address autorizado',
    };

    setResultado(res);
    setNfcStatus(verified ? 'success' : 'error');
    setNfcMsg(verified ? 'Firma verificada correctamente' : 'Firma inválida o no autorizada');

    Haptics.notificationAsync(
      verified
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );

    // Guardar en SQLite
    insertValidacion({
      trama:         parsed.raw,
      doc_id:        parsed.docId,
      firmante_id:   parsed.id,
      firma_hex:     firmaHex,
      address_found: res.address || '',
      resultado:     verified ? 'valido' : 'invalido',
      detalle:       res.detalle,
      nfc_uid:       result.uid,
    });
  };

  const handleSheetClose = () => {
    setNfcSheet(false);
    if (resultado) setStep(STEP_RESULT);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva validación</Text>
        <View style={{ width: 70 }} />
      </View>

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
                    {[['tl'],['tr'],['bl'],['br']].map(([pos]) => (
                      <View key={pos} style={[styles.corner, styles[pos]]} />
                    ))}
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                  <Text style={styles.scanHint}>Apunta al QR o código de barras</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Conceder permiso de cámara</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* PASO 2: Leer NFC */}
      {step === STEP_NFC && parsed && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Documento escaneado</Text>
            <DataRow label="Doc ID"      value={parsed.docId} accent />
            <DataRow label="Tipo"        value={parsed.tipo === '1' ? 'DNI' : 'RUC'} />
            <DataRow label="Número"      value={parsed.numero} />
            <DataRow label="Vencimiento" value={parsed.fecha} />
            <DataRow label="ID firmante" value={parsed.id} />
          </View>
          <View style={styles.nfcCard}>
            <Text style={{ fontSize: 40 }}>📡</Text>
            <Text style={styles.nfcCardTitle}>Verificar sello NFC</Text>
            <Text style={styles.nfcCardSub}>Acerca el tag para leer la firma</Text>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.success }]} onPress={handleReadNfc}>
            <Text style={styles.primaryBtnText}>📡 Leer tag NFC</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 3: Resultado */}
      {step === STEP_RESULT && resultado && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={[styles.resultBadge, { backgroundColor: resultado.valido ? Colors.successGlow : Colors.errorGlow, borderColor: resultado.valido ? Colors.success : Colors.error }]}>
            <Text style={styles.resultBadgeIcon}>{resultado.valido ? '✓' : '✕'}</Text>
            <Text style={[styles.resultBadgeText, { color: resultado.valido ? Colors.success : Colors.error }]}>
              {resultado.valido ? 'Firma válida' : 'Firma inválida'}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado</Text>
            <DataRow label="Doc ID"    value={parsed.docId} accent />
            <DataRow label="Resultado" value={resultado.valido ? '✓ VÁLIDO' : '✕ INVÁLIDO'} />
            {resultado.firmante && <DataRow label="Firmado por" value={resultado.firmante.label} />}
            {resultado.address  && <DataRow label="Address"    value={resultado.address.slice(0,18) + '...'} />}
            <DataRow label="Detalle" value={resultado.detalle} />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Ver validaciones</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <NfcSheet
        visible={nfcSheet}
        mode="read"
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
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMid:    { flexDirection: 'row', height: FRAME },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: Spacing.xl },
  scanHint:{ fontSize: FontSize.md, color: 'white', textAlign: 'center' },
  frame:   { width: FRAME, height: FRAME, position: 'relative' },
  corner:  { position: 'absolute', width: CW, height: CW, borderColor: Colors.success, borderWidth: 0 },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scroll:  { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card:    { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.xs },
  cardTitle:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dataLabel:{ fontSize: FontSize.sm, color: Colors.textSecondary },
  dataValue:{ fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  nfcCard: { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.bgBorder, alignItems: 'center', gap: Spacing.sm },
  nfcCardTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  nfcCardSub:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  permBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.accent, borderRadius: Radius.md },
  permBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.bg },
  primaryBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  primaryBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.bg },
  resultBadge: { borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1.5, alignItems: 'center', gap: Spacing.sm },
  resultBadgeIcon: { fontSize: 52, fontWeight: FontWeight.black },
  resultBadgeText: { fontSize: FontSize.xxl, fontWeight: FontWeight.black },
});

export default NuevaValidacionScreen;
