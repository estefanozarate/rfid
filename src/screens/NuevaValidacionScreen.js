import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Dimensions,
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
import { getWhitelist } from '../db/whitelistRepository';

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const fs        = (n) => isTablet ? n * 1.25 : n;

const STEP_SCAN   = 'scan';
const STEP_NFC    = 'nfc';
const STEP_RESULT = 'result';

const DataRow = ({ label, value, accent }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={[styles.dataValue, accent && { color: Colors.accent }]} numberOfLines={1}>{String(value || '—')}</Text>
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
  const [resultado, setResultado] = useState(null);

  const { readTag } = useNfcNdefReader();

  React.useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // Reset completo para nueva validación
  const handleReset = () => {
    setStep(STEP_SCAN);
    setScanned(false);
    setParsed(null);
    setNfcStatus('waiting');
    setNfcMsg(null);
    setResultado(null);
  };

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); return; }
    setParsed(result);
    setStep(STEP_NFC);
  };

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

    const firmaHex  = result.text;
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
      valido:   verified,
      firmante: signer,
      address:  signer?.address || null,
      firmaHex,
      nfcUid:   result.uid,
      detalle:  verified
        ? `Firmado por: ${signer.label} (${signer.address.slice(0,10)}...)`
        : 'La firma no corresponde a ningún address autorizado',
    };

    setResultado(res);
    setNfcStatus(verified ? 'success' : 'error');
    setNfcMsg(verified ? 'Firma verificada correctamente' : 'Firma inválida o no autorizada');

    Haptics.notificationAsync(verified
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error);

    insertValidacion({
      trama: parsed.raw, doc_id: parsed.docId, firmante_id: parsed.id,
      firma_hex: firmaHex, address_found: res.address || '',
      resultado: verified ? 'valido' : 'invalido',
      detalle: res.detalle, nfc_uid: result.uid,
    });
  };

  const handleSheetClose = () => {
    setNfcSheet(false);
    if (resultado) setStep(STEP_RESULT);
  };

  const handleVerValidaciones = () => {
    navigation.getParent()?.navigate('ValidarTab', { screen: 'Validaciones' });
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
        <Text style={[styles.headerTitle, { fontSize: fs(FontSize.lg) }]}>Nueva validación</Text>
        <View style={{ width: 70 }} />
      </View>

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
                        borderColor:Colors.success, borderWidth:0,
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: Spacing.xl }}>
                  <Text style={{ fontSize: fs(FontSize.md), color: 'white', textAlign: 'center' }}>Apunta al QR o código de barras</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Conceder permiso de cámara</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {step === STEP_NFC && parsed && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Documento escaneado</Text>
            <DataRow label="Doc ID"      value={parsed.docId} accent />
            <DataRow label="Tipo"        value={parsed.tipo === '1' ? 'DNI' : 'RUC'} />
            <DataRow label="Número"      value={parsed.numero} />
            <DataRow label="Vencimiento" value={parsed.fecha} />
            <DataRow label="ID firmante" value={parsed.id} />
          </View>
          <View style={[styles.card, { alignItems: 'center', gap: Spacing.sm }]}>
            <Text style={{ fontSize: fs(FontSize.xl), fontWeight: FontWeight.bold, color: Colors.textPrimary }}>Verificar sello NFC</Text>
            <Text style={{ fontSize: fs(FontSize.sm), color: Colors.textSecondary, textAlign: 'center' }}>Acerca el tag para leer la firma</Text>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.success }]} onPress={handleReadNfc}>
            <Text style={[styles.primaryBtnText, { fontSize: fs(FontSize.lg) }]}>Leer tag NFC</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === STEP_RESULT && resultado && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <View style={[styles.resultBadge, {
            backgroundColor: resultado.valido ? Colors.successGlow : Colors.errorGlow,
            borderColor:     resultado.valido ? Colors.success     : Colors.error,
          }]}>
            <Text style={[styles.resultIcon, { fontSize: fs(52), color: resultado.valido ? Colors.success : Colors.error }]}>
              {resultado.valido ? '✓' : '✕'}
            </Text>
            <Text style={[styles.resultText, { fontSize: fs(FontSize.xxl), color: resultado.valido ? Colors.success : Colors.error }]}>
              {resultado.valido ? 'Firma válida' : 'Firma inválida'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado</Text>
            <DataRow label="Doc ID"    value={parsed.docId} accent />
            <DataRow label="Estado"    value={resultado.valido ? '✓ VÁLIDO' : '✕ INVÁLIDO'} />
            {resultado.firmante && <DataRow label="Firmado por" value={resultado.firmante.label} />}
            {resultado.address  && <DataRow label="Address"    value={resultado.address.slice(0,18) + '...'} />}
            <DataRow label="Detalle"   value={resultado.detalle} />
          </View>

          <View style={styles.doneBtns}>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleVerValidaciones}>
              <Text style={[styles.primaryBtnText, { fontSize: fs(FontSize.md) }]}>Ver validaciones</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={handleReset}>
              <Text style={[styles.secondaryBtnText, { fontSize: fs(FontSize.md) }]}>Nueva validación</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <NfcSheet visible={nfcSheet} mode="read" status={nfcStatus} message={nfcMsg} onCancel={handleSheetClose} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder },
  backBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, width: 70 },
  backText:{ color: Colors.textSecondary, fontWeight: FontWeight.medium },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: FontWeight.bold, color: Colors.textPrimary },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card:    { backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.bgBorder, gap: Spacing.xs },
  cardTitle:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dataLabel:{ fontSize: FontSize.sm, color: Colors.textSecondary },
  dataValue:{ fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  primaryBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  primaryBtnText: { fontWeight: FontWeight.bold, color: Colors.bg },
  secondaryBtn: { backgroundColor: 'transparent', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.success },
  secondaryBtnText: { fontWeight: FontWeight.bold, color: Colors.success },
  resultBadge: { borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1.5, alignItems: 'center', gap: Spacing.sm },
  resultIcon:  { fontWeight: FontWeight.black },
  resultText:  { fontWeight: FontWeight.black },
  doneBtns:    { flexDirection: 'row', gap: Spacing.md },
});

export default NuevaValidacionScreen;
