import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { RFontSize, rs } from '../utils/responsive';
import ScreenHeader, { StepBar } from '../components/ScreenHeader';
import QRScanner from '../components/QRScanner';
import PinConfirmModal from '../components/PinConfirmModal';
import NfcSheet from '../components/NfcSheet';
import Icon from '../components/Icon';
import { parseTrama } from '../utils/tramaParser';
import { hashTrama } from '../utils/hash';
import { signPayload, hasWallet, hasPinSetup } from '../services/walletService';
import { useNfcWriter } from '../hooks/useNfcWriter';
import { insertSello } from '../db/sellosRepository';

const useCameraPermissions = require('expo-camera').useCameraPermissions;

const STEPS     = ['Escanear', 'Firmar', 'NFC', 'Listo'];
const STEP_SCAN = 'Escanear';
const STEP_SIGN = 'Firmar';
const STEP_NFC  = 'NFC';
const STEP_DONE = 'Listo';

const DataRow = ({ label, value, theme }) => (
  <View style={styles.dataRow}>
    <Text style={[styles.dataLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>{label}</Text>
    <Text style={[styles.dataValue, { color: theme.textPrimary, fontSize: RFontSize.sm }]} numberOfLines={1}>{String(value || '—')}</Text>
  </View>
);

const NuevoSelloScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { showToast }     = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [step,       setStep]     = useState(STEP_SCAN);
  const [scanned,    setScanned]  = useState(false);
  const [parsed,     setParsed]   = useState(null);
  const [signing,    setSigning]  = useState(false);
  const [signError,  setSignError]= useState('');
  const [firmaHex,   setFirmaHex] = useState('');
  const [nfcSheet,   setNfcSheet] = useState(false);
  const [nfcStatus,  setNfcStatus]= useState('waiting');
  const [nfcMsg,     setNfcMsg]   = useState('');
  const [pinModal,   setPinModal] = useState(false);

  const { writeTag } = useNfcWriter();

  React.useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); showToast('Código no reconocido', 'error'); return; }
    setParsed(result);
    setStep(STEP_SIGN);
  };

  const handleSign = async () => {
    const ok = await hasWallet();
    if (!ok) { setSignError('No tienes wallet. Créala desde Wallet.'); return; }
    const hasPin = await hasPinSetup();
    if (!hasPin) { setSignError('Configura tu PIN primero en Wallet.'); return; }
    // Abrir modal de PIN
    setPinModal(true);
  };

  const handlePinSuccess = async (pin) => {
    setPinModal(false);
    setSigning(true);
    setSignError('');
    try {
      const firma = await signPayload(parsed.raw, pin);
      setFirmaHex(firma);
      setStep(STEP_NFC);
    } catch (e) {
      setSignError(e.message);
    } finally { setSigning(false); }
  };

  const handleWriteNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg('');
    const result = await writeTag(firmaHex);
    if (result.success) {
      setNfcStatus('success');
      setNfcMsg('Documento sellado correctamente');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      insertSello({
        trama_hash: hashTrama(parsed.raw),
        trama: parsed.raw, doc_id: parsed.docId, firmante_id: parsed.id,
        tipo_doc: parsed.tipo === '1' ? 'DNI' : 'RUC', num_id: parsed.numero,
        fecha_venc: parsed.fecha, texto_libre: parsed.textoLibre,
        firma_hex: firmaHex, nfc_uid: result.uid,
      });
    } else {
      setNfcStatus('error');
      setNfcMsg(result.error || 'Error al escribir el tag');
    }
  };

  const handleSheetClose = () => {
    setNfcSheet(false);
    if (nfcStatus === 'success') setStep(STEP_DONE);
  };

  const handleVerSellos = () => navigation.getParent()?.navigate('SellarTab', { screen: 'Sellos' });

  const handleNuevoSello = () => {
    setStep(STEP_SCAN); setScanned(false); setParsed(null);
    setFirmaHex(''); setSignError(''); setNfcStatus('waiting'); setNfcMsg('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScreenHeader title="Nuevo sello" onBack={() => navigation.goBack()} theme={theme} />
      <StepBar steps={STEPS} currentStep={step} theme={theme} />

      {/* ESCANEAR */}
      {step === STEP_SCAN && (
        permission?.granted
          ? <QRScanner onScanned={handleScan} cornerColor={theme.accent} />
          : <View style={styles.centered}>
              <Text style={[styles.permTxt, { color: theme.textSecondary, fontSize: RFontSize.md }]}>
                Se requiere acceso a la cámara
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={requestPermission}>
                <Text style={[styles.btnTxt, { fontSize: RFontSize.md }]}>Conceder permiso</Text>
              </TouchableOpacity>
            </View>
      )}

      {/* FIRMAR */}
      {step === STEP_SIGN && parsed && (
        <ScrollView contentContainerStyle={[styles.content, { gap: rs(Spacing.md) }]}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>DOCUMENTO</Text>
            <DataRow label="Tipo"        value={parsed.tipo === '1' ? 'DNI' : 'RUC'} theme={theme} />
            <DataRow label="Número"      value={parsed.numero} theme={theme} />
            <DataRow label="Vencimiento" value={parsed.fecha}  theme={theme} />
            <DataRow label="ID firmante" value={parsed.id}     theme={theme} />
            <DataRow label="Doc ID"      value={parsed.docId}  theme={theme} />
            {parsed.textoLibre ? <DataRow label="Texto libre" value={parsed.textoLibre} theme={theme} /> : null}
          </View>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>TRAMA</Text>
            <Text style={[styles.tramaText, { color: theme.accent, fontSize: RFontSize.xs }]}>{parsed.raw}</Text>
          </View>
          {signError ? <Text style={[styles.errTxt, { color: theme.error, fontSize: RFontSize.sm }]}>{signError}</Text> : null}
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleSign} disabled={signing}>
            {signing ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnRow}>
                <Icon name="lock" size={RFontSize.lg} color="#fff" />
                <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Firmar con mi wallet</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* NFC */}
      {step === STEP_NFC && (
        <ScrollView contentContainerStyle={[styles.content, { gap: rs(Spacing.md) }]}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>FIRMA GENERADA</Text>
            <Text style={[styles.firmaText, { color: theme.textSecondary, fontSize: rs(9) }]} numberOfLines={4}>{firmaHex}</Text>
          </View>
          <View style={[styles.nfcCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Icon name="nfc" size={rs(44)} color={theme.accent} />
            <Text style={[styles.nfcTitle, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>Listo para sellar</Text>
            <Text style={[styles.nfcSub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
              Toca el botón y acerca el tag NFC al teléfono
            </Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleWriteNfc}>
            <View style={styles.btnRow}>
              <Icon name="nfc" size={RFontSize.lg} color="#fff" />
              <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Escribir en tag NFC</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* LISTO */}
      {step === STEP_DONE && (
        <View style={styles.doneContainer}>
          <View style={[styles.doneCircle, { backgroundColor: theme.successGlow, borderColor: theme.success }]}>
            <View style={[styles.checkMark, { borderColor: theme.success }]} />
          </View>
          <Text style={[styles.doneTitle, { color: theme.success, fontSize: RFontSize.xxl }]}>
            ¡Documento sellado!
          </Text>
          <Text style={[styles.doneSub, { color: theme.textSecondary, fontSize: RFontSize.md }]}>
            La firma fue escrita en el tag NFC.
          </Text>
          <View style={styles.doneBtns}>
            <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: theme.accent }]} onPress={handleVerSellos}>
              <Text style={[styles.btnTxt, { fontSize: RFontSize.md }]}>Ver sellos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1, borderColor: theme.accent }]} onPress={handleNuevoSello}>
              <Text style={[styles.btnOutlineTxt, { color: theme.accent, fontSize: RFontSize.md }]}>Nuevo sello</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PinConfirmModal visible={pinModal} onSuccess={handlePinSuccess} onCancel={() => setPinModal(false)} theme={theme} />
      <NfcSheet visible={nfcSheet} mode="write" status={nfcStatus} message={nfcMsg} onCancel={handleSheetClose} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.md), padding: rs(Spacing.xl) },
  content:     { padding: rs(Spacing.md), paddingBottom: rs(Spacing.xxl) },
  card:        { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, gap: rs(6) },
  cardTitle:   { fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: rs(4) },
  dataRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(3) },
  dataLabel:   {},
  dataValue:   { fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  tramaText:   { fontFamily: 'monospace', lineHeight: rs(18) },
  firmaText:   { fontFamily: 'monospace', lineHeight: rs(16) },
  errTxt:      { textAlign: 'center', fontWeight: FontWeight.medium },
  permTxt:     { textAlign: 'center' },
  nfcCard:     { borderRadius: Radius.lg, padding: rs(Spacing.xl), borderWidth: 1, alignItems: 'center', gap: rs(Spacing.sm) },
  nfcTitle:    { fontWeight: FontWeight.bold },
  nfcSub:      { textAlign: 'center' },
  btn:         { borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center', justifyContent: 'center' },
  btnRow:      { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.sm) },
  btnTxt:      { color: '#fff', fontWeight: FontWeight.bold },
  btnOutline:  { borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center', borderWidth: 1.5 },
  btnOutlineTxt:{ fontWeight: FontWeight.bold },
  doneContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(Spacing.xl), gap: rs(Spacing.lg) },
  doneCircle:  { width: rs(100), height: rs(100), borderRadius: rs(50), borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark:   { width: rs(32), height: rs(18), borderLeftWidth: 3, borderBottomWidth: 3, transform: [{ rotate: '-45deg' }], marginTop: rs(6) },
  doneTitle:   { fontWeight: FontWeight.black },
  doneSub:     { textAlign: 'center' },
  doneBtns:    { flexDirection: 'row', gap: rs(Spacing.md), width: '100%' },
});

export default NuevoSelloScreen;
