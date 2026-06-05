import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Dimensions,
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

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const fs        = (n) => isTablet ? n * 1.25 : n;

const STEP_SCAN = 'scan';
const STEP_SIGN = 'sign';
const STEP_NFC  = 'nfc';
const STEP_DONE = 'done';

const StepBar = ({ step }) => {
  const steps  = [STEP_SCAN, STEP_SIGN, STEP_NFC, STEP_DONE];
  const labels = ['Escanear', 'Firmar', 'NFC', 'Listo'];
  const idx    = steps.indexOf(step);
  return (
    <View style={styles.stepBar}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, i <= idx && styles.stepDotActive]}>
              <Text style={[styles.stepDotTxt, i <= idx && styles.stepDotTxtOn]}>
                {i < idx ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[styles.stepLbl, i <= idx && styles.stepLblOn]}>{labels[i]}</Text>
          </View>
          {i < steps.length - 1 && <View style={[styles.stepLine, i < idx && styles.stepLineOn]} />}
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
  const [savedSello, setSavedSello] = useState(null);

  const { writeTag } = useNfcWriter();

  React.useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); return; }
    setParsed(result);
    setStep(STEP_SIGN);
  };

  const handleSign = async () => {
    setSigning(true);
    setSignError(null);
    try {
      const ok = await hasWallet();
      if (!ok) throw new Error('No tienes wallet. Créala desde Wallet.');
      const firma = await signPayload(parsed.raw);
      setFirmaHex(firma);
      setStep(STEP_NFC);
    } catch (e) {
      setSignError(e.message);
    } finally { setSigning(false); }
  };

  const handleWriteNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg(null);
    const result = await writeTag(firmaHex);

    if (result.success) {
      setNfcStatus('success');
      setNfcMsg('Documento sellado correctamente');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const id = insertSello({
        trama: parsed.raw, doc_id: parsed.docId, firmante_id: parsed.id,
        tipo_doc: parsed.tipo === '1' ? 'DNI' : 'RUC', num_id: parsed.numero,
        fecha_venc: parsed.fecha, texto_libre: parsed.textoLibre,
        firma_hex: firmaHex, nfc_uid: result.uid,
      });
      setSavedSello(id);
    } else {
      setNfcStatus('error');
      setNfcMsg(result.error || 'Error al escribir el tag');
    }
  };

  const handleSheetClose = () => {
    setNfcSheet(false);
    if (nfcStatus === 'success') setStep(STEP_DONE);
  };

  const handleVerSellos = () => {
    // Navegar al tab de Sellos y refrescar
    navigation.getParent()?.navigate('SellarTab', { screen: 'Sellos' });
  };

  const handleNuevoSello = () => {
    // Reset completo para otro sello
    setStep(STEP_SCAN);
    setScanned(false);
    setParsed(null);
    setFirmaHex(null);
    setSignError(null);
    setNfcStatus('waiting');
    setNfcMsg(null);
    setSavedSello(null);
  };

  const FRAME = isTablet ? 320 : 240;
  const CW    = isTablet ? 32  : 24;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { fontSize: fs(FontSize.md) }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: fs(FontSize.lg) }]}>Nuevo sello</Text>
        <View style={{ width: 70 }} />
      </View>

      <StepBar step={step} />

      {step === STEP_SCAN && (
        <View style={{ flex: 1 }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr','code128','code39','ean13'] }}
                onBarcodeScanned={handleScan}
              />
              <View style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                <View style={{ flexDirection: 'row', height: FRAME }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                  <View style={{ width: FRAME, height: FRAME, position: 'relative' }}>
                    {[{t:0,l:0,bt:'t',bl:'l'},{t:0,r:0,bt:'t',bl:'r'},{b:0,l:0,bt:'b',bl:'l'},{b:0,r:0,bt:'b',bl:'r'}].map((pos, i) => (
                      <View key={i} style={[{
                        position:'absolute', width:CW, height:CW,
                        borderColor:Colors.accent, borderWidth:0,
                        top:pos.t, left:pos.l, right:pos.r, bottom:pos.b,
                      },{
                        borderTopWidth:    pos.bt==='t'?3:0,
                        borderBottomWidth: pos.bt==='b'?3:0,
                        borderLeftWidth:   pos.bl==='l'?3:0,
                        borderRightWidth:  pos.bl==='r'?3:0,
                      }]} />
                    ))}
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: Spacing.xl, gap: 6 }}>
                  <Text style={{ fontSize: fs(FontSize.md), color: 'white', textAlign: 'center' }}>Apunta al QR o código de barras</Text>
                  <Text style={{ fontSize: fs(FontSize.xs), color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>QR · Code128 · Code39 · EAN</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={[styles.permText, { fontSize: fs(FontSize.md) }]}>Se requiere acceso a la cámara</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={[styles.primaryBtnText, { fontSize: fs(FontSize.md) }]}>Conceder permiso</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {step === STEP_SIGN && parsed && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datos del documento</Text>
            <DataRow label="Tipo"        value={parsed.tipo === '1' ? 'DNI' : 'RUC'} />
            <DataRow label="Número"      value={parsed.numero} />
            <DataRow label="Vencimiento" value={parsed.fecha} />
            <DataRow label="ID firmante" value={parsed.id} />
            <DataRow label="Doc ID"      value={parsed.docId} />
            {parsed.textoLibre ? <DataRow label="Texto libre" value={parsed.textoLibre} /> : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trama</Text>
            <Text style={styles.tramaText}>{parsed.raw}</Text>
          </View>
          {signError && <View style={styles.errorBox}><Text style={[styles.errorText, { fontSize: fs(FontSize.sm) }]}>{signError}</Text></View>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSign} disabled={signing}>
            {signing ? <ActivityIndicator color={Colors.bg} /> : <Text style={[styles.primaryBtnText, { fontSize: fs(FontSize.lg) }]}>Firmar con mi wallet</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === STEP_NFC && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Firma generada</Text>
            <Text style={styles.firmaText} numberOfLines={4}>{firmaHex}</Text>
          </View>
          <View style={[styles.card, { alignItems: 'center', gap: Spacing.sm }]}>
            <Text style={{ fontSize: fs(FontSize.xl), fontWeight: FontWeight.bold, color: Colors.textPrimary }}>Listo para sellar</Text>
            <Text style={{ fontSize: fs(FontSize.sm), color: Colors.textSecondary, textAlign: 'center' }}>Toca el botón y acerca el tag NFC</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleWriteNfc}>
            <Text style={[styles.primaryBtnText, { fontSize: fs(FontSize.lg) }]}>Escribir en tag NFC</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === STEP_DONE && (
        <View style={styles.doneContainer}>
          <View style={styles.doneCircle}>
            <Text style={[styles.doneIcon, { fontSize: fs(48) }]}>✓</Text>
          </View>
          <Text style={[styles.doneTitle, { fontSize: fs(FontSize.xxl) }]}>¡Documento sellado!</Text>
          <Text style={[styles.doneSub, { fontSize: fs(FontSize.md) }]}>La firma fue escrita en el tag NFC correctamente.</Text>
          <View style={styles.doneBtns}>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleVerSellos}>
              <Text style={[styles.primaryBtnText, { fontSize: fs(FontSize.md) }]}>Ver sellos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={handleNuevoSello}>
              <Text style={[styles.secondaryBtnText, { fontSize: fs(FontSize.md) }]}>Nuevo sello</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <NfcSheet visible={nfcSheet} mode="write" status={nfcStatus} message={nfcMsg} onCancel={handleSheetClose} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  backBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, width: 70 },
  backText:{ color: Colors.textSecondary, fontWeight: FontWeight.medium },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: FontWeight.bold, color: Colors.textPrimary },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  stepBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  stepItem:{ alignItems: 'center', gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.bgSurface, borderWidth: 1.5, borderColor: Colors.bgBorder, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:  { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepDotTxt:     { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.bold },
  stepDotTxtOn:   { color: Colors.bg },
  stepLbl:        { fontSize: 9, color: Colors.textMuted, letterSpacing: 0.3 },
  stepLblOn:      { color: Colors.accent },
  stepLine:       { flex: 1, height: 1.5, backgroundColor: Colors.bgBorder, marginBottom: 14 },
  stepLineOn:     { backgroundColor: Colors.accent },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card:    { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.xs },
  cardTitle:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dataLabel:{ fontSize: FontSize.sm, color: Colors.textSecondary },
  dataValue:{ fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  tramaText:{ fontSize: FontSize.xs, color: Colors.accent, fontFamily: 'monospace', lineHeight: 18 },
  firmaText:{ fontSize: 9, color: Colors.textSecondary, fontFamily: 'monospace', lineHeight: 16 },
  errorBox: { backgroundColor: Colors.errorGlow, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.errorDim },
  errorText:{ color: Colors.error },
  permText: { color: Colors.textSecondary, textAlign: 'center' },
  primaryBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  primaryBtnText: { fontWeight: FontWeight.bold, color: Colors.bg },
  secondaryBtn: { backgroundColor: 'transparent', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.accent },
  secondaryBtnText: { fontWeight: FontWeight.bold, color: Colors.accent },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  doneCircle:    { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.successGlow, borderWidth: 2, borderColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  doneIcon:      { color: Colors.success, fontWeight: FontWeight.black },
  doneTitle:     { fontWeight: FontWeight.black, color: Colors.success },
  doneSub:       { color: Colors.textSecondary, textAlign: 'center' },
  doneBtns:      { flexDirection: 'row', gap: Spacing.md, width: '100%' },
});

export default NuevoSelloScreen;
