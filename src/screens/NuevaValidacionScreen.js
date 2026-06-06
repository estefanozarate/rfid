import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { RFontSize, rs } from '../utils/responsive';
import ScreenHeader, { StepBar } from '../components/ScreenHeader';
import QRScanner from '../components/QRScanner';
import NfcSheet from '../components/NfcSheet';
import Icon from '../components/Icon';
import { parseTrama, buildSignPayload } from '../utils/tramaParser';

import { hashTrama } from '../utils/hash';
import { verifySignature } from '../services/walletService';
import { useNfcNdefReader } from '../hooks/useNfcNdefReader';
import { insertValidacion } from '../db/validacionesRepository';
import { getWhitelist } from '../db/whitelistRepository';

const useCameraPermissions = require('expo-camera').useCameraPermissions;

const STEPS      = ['Escanear', 'Leer NFC', 'Resultado'];
const STEP_SCAN  = 'Escanear';
const STEP_NFC   = 'Leer NFC';
const STEP_RESULT= 'Resultado';

const DataRow = ({ label, value, accent, theme }) => (
  <View style={styles.dataRow}>
    <Text style={[styles.dataLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>{label}</Text>
    <Text style={[styles.dataValue, { color: accent ? theme.accent : theme.textPrimary, fontSize: RFontSize.sm }]} numberOfLines={1}>
      {String(value || '—')}
    </Text>
  </View>
);

const NuevaValidacionScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { showToast }     = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [step,      setStep]      = useState(STEP_SCAN);
  const [scanned,   setScanned]   = useState(false);
  const [parsed,    setParsed]    = useState(null);
  const [nfcSheet,  setNfcSheet]  = useState(false);
  const [nfcStatus, setNfcStatus] = useState('waiting');
  const [nfcMsg,    setNfcMsg]    = useState('');
  const [resultado, setResultado] = useState(null);

  const { readTag } = useNfcNdefReader();

  React.useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  const handleReset = () => {
    setStep(STEP_SCAN); setScanned(false); setParsed(null);
    setNfcStatus('waiting'); setNfcMsg(''); setResultado(null);
  };

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); showToast('Código no reconocido', 'error'); return; }
    setParsed(result);
    setStep(STEP_NFC);
  };

  const handleReadNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg('');

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

    const debugPayload = buildSignPayload(parsed.raw, result.uid);
    console.log('[DEBUG VALIDAR] UID leído del tag:', result.uid);
    console.log('[DEBUG VALIDAR] Trama del QR:', parsed.raw);
    console.log('[DEBUG VALIDAR] Payload a verificar:', debugPayload);
    console.log('[DEBUG VALIDAR] Firma leída del tag:', firmaHex.slice(0, 20) + '...');
    console.log('[DEBUG VALIDAR] Firmantes en whitelist:', whitelist.length);

    for (const w of whitelist) {
      const payload = buildSignPayload(parsed.raw, result.uid);
      console.log('[DEBUG VALIDAR] Verificando contra address:', w.address.slice(0, 12) + '...');
      if (verifySignature(payload, firmaHex, w.address)) {
        verified = true; signer = w; break;
      }
    }

    const res = {
      valido:   verified,
      firmante: signer,
      address:  signer?.address || null,
      firmaHex,
      nfcUid:   result.uid,
      detalle:  verified
        ? `Firmado por: ${signer.label}`
        : 'La firma no corresponde a ningún address autorizado',
    };

    setResultado(res);
    setNfcStatus(verified ? 'success' : 'error');
    setNfcMsg(verified ? 'Firma verificada correctamente' : 'Firma inválida o no autorizada');

    Haptics.notificationAsync(verified
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error);

    insertValidacion({
      trama_hash: hashTrama(parsed.raw),
      trama: parsed.raw, doc_id: parsed.docId, firmante_id: parsed.id,
      tipo_doc: parsed.tipo === '1' ? 'DNI' : 'RUC', num_id: parsed.numero,
      fecha_venc: parsed.fecha, texto_libre: parsed.textoLibre,
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
    navigation.navigate('Main', { screen: 'ValidarTab' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScreenHeader title="Nueva validación" onBack={() => navigation.goBack()} theme={theme} />
      <StepBar steps={STEPS} currentStep={step} theme={theme} />

      {/* ESCANEAR */}
      {step === STEP_SCAN && (
        permission?.granted
          ? <QRScanner onScanned={handleScan} cornerColor={theme.success} />
          : <View style={styles.centered}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={requestPermission}>
                <Text style={[styles.btnTxt, { fontSize: RFontSize.md }]}>Conceder permiso de cámara</Text>
              </TouchableOpacity>
            </View>
      )}

      {/* LEER NFC */}
      {step === STEP_NFC && parsed && (
        <ScrollView contentContainerStyle={[styles.content, { gap: rs(Spacing.md) }]}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>DOCUMENTO ESCANEADO</Text>
            <DataRow label="Doc ID"      value={parsed.docId}  accent theme={theme} />
            <DataRow label="Tipo"        value={parsed.tipo === '1' ? 'DNI' : 'RUC'} theme={theme} />
            <DataRow label="Número"      value={parsed.numero} theme={theme} />
            <DataRow label="Vencimiento" value={parsed.fecha}  theme={theme} />
            <DataRow label="ID firmante" value={parsed.id}     theme={theme} />
          </View>
          <View style={[styles.nfcCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Icon name="nfc" size={rs(44)} color={theme.success} />
            <Text style={[styles.nfcTitle, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
              Verificar sello NFC
            </Text>
            <Text style={[styles.nfcSub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
              Acerca el tag para leer la firma
            </Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.success }]} onPress={handleReadNfc}>
            <View style={styles.btnRow}>
              <Icon name="nfc" size={RFontSize.lg} color="#fff" />
              <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Leer tag NFC</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* RESULTADO */}
      {step === STEP_RESULT && resultado && (
        <ScrollView contentContainerStyle={[styles.content, { gap: rs(Spacing.md) }]}>
          <View style={[styles.resultBadge, {
            backgroundColor: resultado.valido ? theme.successGlow : theme.errorGlow,
            borderColor:     resultado.valido ? theme.success     : theme.error,
          }]}>
            <Icon
              name={resultado.valido ? 'checkCircle' : 'xCircle'}
              size={rs(52)}
              color={resultado.valido ? theme.success : theme.error}
            />
            <Text style={[styles.resultTitle, {
              color: resultado.valido ? theme.success : theme.error,
              fontSize: RFontSize.xxl,
            }]}>
              {resultado.valido ? 'Firma válida' : 'Firma inválida'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>RESULTADO</Text>
            <DataRow label="Doc ID"     value={parsed.docId} accent theme={theme} />
            <DataRow label="Estado"     value={resultado.valido ? '✓ VÁLIDO' : '✕ INVÁLIDO'} theme={theme} />
            {resultado.firmante && <DataRow label="Firmado por" value={resultado.firmante.label} theme={theme} />}
            {resultado.address  && <DataRow label="Address"    value={resultado.address.slice(0,18)+'...'} theme={theme} />}
            <DataRow label="Detalle"   value={resultado.detalle} theme={theme} />
          </View>

          <View style={styles.doneBtns}>
            <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: theme.accent }]} onPress={handleVerValidaciones}>
              <Text style={[styles.btnTxt, { fontSize: RFontSize.md }]}>Ver validaciones</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1, borderColor: theme.success }]} onPress={handleReset}>
              <Text style={[styles.btnOutlineTxt, { color: theme.success, fontSize: RFontSize.md }]}>Nueva validación</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <NfcSheet visible={nfcSheet} mode="read" status={nfcStatus} message={nfcMsg} onCancel={handleSheetClose} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.md) },
  content:      { padding: rs(Spacing.md), paddingBottom: rs(Spacing.xxl) },
  card:         { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, gap: rs(6) },
  cardTitle:    { fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: rs(4) },
  dataRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(3) },
  dataLabel:    {},
  dataValue:    { fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  nfcCard:      { borderRadius: Radius.lg, padding: rs(Spacing.xl), borderWidth: 1, alignItems: 'center', gap: rs(Spacing.sm) },
  nfcTitle:     { fontWeight: FontWeight.bold },
  nfcSub:       { textAlign: 'center' },
  btn:          { borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center', justifyContent: 'center' },
  btnRow:       { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.sm) },
  btnTxt:       { color: '#fff', fontWeight: FontWeight.bold },
  btnOutline:   { borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center', borderWidth: 1.5 },
  btnOutlineTxt:{ fontWeight: FontWeight.bold },
  resultBadge:  { borderRadius: Radius.lg, padding: rs(Spacing.xl), borderWidth: 1.5, alignItems: 'center', gap: rs(Spacing.sm) },
  resultTitle:  { fontWeight: FontWeight.black },
  doneBtns:     { flexDirection: 'row', gap: rs(Spacing.md) },
});

export default NuevaValidacionScreen;
