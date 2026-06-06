import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius, FontWeight } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { useNfcGuardControl } from '../context/NfcGuardContext';
import { RFontSize, rs } from '../utils/responsive';
import ScreenHeader, { StepBar } from '../components/ScreenHeader';
import QRScanner from '../components/QRScanner';
import PinConfirmModal from '../components/PinConfirmModal';
import NfcSheet from '../components/NfcSheet';
import Icon from '../components/Icon';
import { parseTrama, buildSignPayload } from '../utils/tramaParser';
import { hashTrama } from '../utils/hash';
import { decryptPrivateKey, signWithKey, hasWallet, hasPinSetup } from '../services/walletService';
import { useNfcWriterWithUid } from '../hooks/useNfcWriter';
import { insertSello } from '../db/sellosRepository';

const useCameraPermissions = require('expo-camera').useCameraPermissions;

const STEPS     = ['Escanear', 'Firmar', 'Sellar', 'Listo'];
const STEP_SCAN = 'Escanear';
const STEP_SIGN = 'Firmar';
const STEP_NFC  = 'Sellar';
const STEP_DONE = 'Listo';

const DataRow = ({ label, value, theme, mono }) => (
  <View style={styles.dataRow}>
    <Text style={[styles.dataLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>{label}</Text>
    <Text style={[styles.dataValue, {
      color: theme.textPrimary,
      fontSize: mono ? RFontSize.xs : RFontSize.sm,
      fontFamily: mono ? 'monospace' : undefined,
    }]} numberOfLines={1}>{String(value || '—')}</Text>
  </View>
);

const NuevoSelloScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { showToast }     = useToast();
  const [permission, requestPermission] = useCameraPermissions();

  const [step,      setStep]      = useState(STEP_SCAN);
  const [scanned,   setScanned]   = useState(false);
  const [parsed,    setParsed]    = useState(null);
  const pinRef     = useRef('');   // PIN temporal
  const privKeyRef = useRef(null);  // privKey descifrada en memoria (bytes)
  const [verifying, setVerifying] = useState(false);
  const [signError, setSignError] = useState('');
  const [pinModal,  setPinModal]  = useState(false);
  const [nfcSheet,  setNfcSheet]  = useState(false);
  const [nfcStatus, setNfcStatus] = useState('waiting');
  const [nfcMsg,    setNfcMsg]    = useState('');

  const { writeTagWithUid } = useNfcWriterWithUid();
  const { pause, resume }   = useNfcGuardControl();

  React.useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  // ── Paso 1: Escanear QR ───────────────────────────────
  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); showToast('Código no reconocido', 'error'); return; }
    setParsed(result);
    setStep(STEP_SIGN);
  };

  // ── Paso 2: Confirmar PIN ─────────────────────────────
  const handleSign = async () => {
    const ok     = await hasWallet();
    const hasPin = ok ? await hasPinSetup() : false;
    if (!ok || !hasPin) { setSignError('Configura tu wallet y PIN primero.'); return; }
    setPinModal(true);
  };

  const handlePinSuccess = async (confirmedPin) => {
    setPinModal(false);
    setVerifying(true);   // spinner 'Verificando...'
    setSignError('');
    try {
      // PASO LENTO aquí (PBKDF2 + descifrado) — SIN tag pegado todavía
      const privKeyBytes = await decryptPrivateKey(confirmedPin);
      privKeyRef.current = privKeyBytes;  // clave lista en memoria
      setVerifying(false);
      setStep(STEP_NFC);
      // Clave lista → lanzar el pad NFC directamente, sin botón intermedio
      setTimeout(() => handleWriteNfc(), 350);
    } catch (e) {
      setVerifying(false);
      setSignError(e.message || 'PIN incorrecto');
    }
  };

  // ── Paso 3: Sellar en NFC ─────────────────────────────
  // Una sola sesión NFC: lee UID → firma con ese UID → escribe
  const handleWriteNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg('');

    const privKeyBytes = privKeyRef.current;
    if (!privKeyBytes) {
      setNfcStatus('error');
      setNfcMsg('La clave no está lista. Vuelve a ingresar el PIN.');
      return;
    }

    let firmaGenerada = '';

    await pause();  // liberar el canal NFC para la operación
    const result = await writeTagWithUid(
      async (uid) => {
        // uid real del tag. Firmar es INSTANTÁNEO (la clave ya está descifrada)
        const payload = buildSignPayload(parsed.raw, uid);
        firmaGenerada = signWithKey(payload, privKeyBytes);
        return firmaGenerada;
      },
      () => setNfcStatus('reading')  // tag detectado → mostrar 'procesando'
    );

    if (result.success) {
      // Dejar que el estado 'reading' (procesando) se perciba antes del ✓
      await new Promise(r => setTimeout(r, 700));
      setNfcStatus('success');
      setNfcMsg('Documento sellado correctamente');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      insertSello({
        trama_hash:  hashTrama(parsed.raw),
        trama:       parsed.raw,
        doc_id:      parsed.docId,
        firmante_id: parsed.id,
        tipo_doc:    parsed.tipo === '1' ? 'DNI' : 'RUC',
        num_id:      parsed.numero,
        fecha_venc:  parsed.fecha,
        texto_libre: parsed.textoLibre,
        firma_hex:   firmaGenerada,
        nfc_uid:     result.uid,
      });
      if (privKeyRef.current) { privKeyRef.current.fill(0); privKeyRef.current = null; }
      pinRef.current = '';
    } else {
      setNfcStatus('error');
      setNfcMsg(result.error || 'Error al sellar');
      // NO limpiar la clave en error — el usuario puede reintentar acercar el tag
    }
  };

  const handleSheetClose = () => {
    setNfcSheet(false);
    resume();  // reactivar la captura NFC
    if (nfcStatus === 'success') setStep(STEP_DONE);
  };

  const handleVerSellos  = () => navigation.navigate('Main', { screen: 'SellarTab' });
  const handleNuevoSello = () => {
    setStep(STEP_SCAN); setScanned(false); setParsed(null);
    if (privKeyRef.current) { privKeyRef.current.fill(0); privKeyRef.current = null; }
    pinRef.current = ''; setSignError(''); setNfcStatus('waiting');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader title="Nuevo sello" onBack={() => navigation.goBack()} theme={theme} />
      <StepBar steps={STEPS} currentStep={step} theme={theme} />

      {/* PASO 1: Escanear */}
      {step === STEP_SCAN && (
        permission?.granted
          ? <QRScanner onScanned={handleScan} cornerColor={theme.accent} />
          : <View style={styles.centered}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={requestPermission}>
                <Text style={[styles.btnTxt, { fontSize: RFontSize.md }]}>Conceder permiso de cámara</Text>
              </TouchableOpacity>
            </View>
      )}

      {/* PASO 2: Confirmar y firmar */}
      {step === STEP_SIGN && parsed && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>DOCUMENTO</Text>
            <DataRow label="Tipo"        value={parsed.tipo === '1' ? 'DNI' : 'RUC'} theme={theme} />
            <DataRow label="Número"      value={parsed.numero}   theme={theme} />
            <DataRow label="Vencimiento" value={parsed.fecha}    theme={theme} />
            <DataRow label="ID firmante" value={parsed.id}       theme={theme} />
            <DataRow label="Doc ID"      value={parsed.docId}    theme={theme} />
            {parsed.textoLibre ? <DataRow label="Texto libre" value={parsed.textoLibre} theme={theme} /> : null}
          </View>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>TRAMA</Text>
            <Text style={[styles.tramaText, { color: theme.accent, fontSize: RFontSize.xs }]}>{parsed.raw}</Text>
          </View>
          {signError ? <Text style={[styles.errTxt, { color: theme.error, fontSize: RFontSize.sm }]}>{signError}</Text> : null}
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleSign} disabled={verifying}>
            {verifying ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Verificando...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Icon name="lock" size={RFontSize.lg} color="#fff" />
                <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Confirmar con PIN</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 3: Sellar NFC */}
      {step === STEP_NFC && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.nfcCard, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Icon name="nfc" size={rs(52)} color={theme.accent} />
            <Text style={[styles.nfcTitle, { color: theme.textPrimary, fontSize: RFontSize.xl }]}>
              Listo para sellar
            </Text>
            <Text style={[styles.nfcSub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
              Acerca el tag NFC al teléfono para grabar el sello
            </Text>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleWriteNfc}>
            <View style={styles.btnRow}>
              <Icon name="nfc" size={RFontSize.lg} color="#fff" />
              <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Sellar documento</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 4: Listo */}
      {step === STEP_DONE && (
        <View style={styles.doneContainer}>
          <View style={[styles.doneCircle, { backgroundColor: theme.successGlow, borderColor: theme.success }]}>
            <View style={[styles.checkMark, { borderColor: theme.success }]} />
          </View>
          <Text style={[styles.doneTitle, { color: theme.success, fontSize: RFontSize.xxl }]}>¡Documento sellado!</Text>
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

      <NfcSheet visible={nfcSheet} mode="write" status={nfcStatus} message={nfcMsg} onCancel={handleSheetClose} />
      <PinConfirmModal visible={pinModal} onSuccess={handlePinSuccess} onCancel={() => setPinModal(false)} theme={theme} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.md), padding: rs(Spacing.xl) },
  content:      { padding: rs(Spacing.md), gap: rs(Spacing.md), paddingBottom: rs(Spacing.xxl) },
  card:         { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, gap: rs(6) },
  cardTitle:    { fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: rs(4) },
  dataRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(3) },
  dataLabel:    {},
  dataValue:    { fontWeight: FontWeight.medium, maxWidth: '58%', textAlign: 'right' },
  tramaText:    { fontFamily: 'monospace', lineHeight: rs(18) },
  errTxt:       { textAlign: 'center', fontWeight: FontWeight.medium },
  nfcCard:      { borderRadius: Radius.lg, padding: rs(Spacing.xl), borderWidth: 1, alignItems: 'center', gap: rs(Spacing.md) },
  nfcTitle:     { fontWeight: FontWeight.bold, textAlign: 'center' },
  nfcSub:       { textAlign: 'center', lineHeight: rs(20) },
  btn:          { borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center', justifyContent: 'center' },
  btnRow:       { flexDirection: 'row', alignItems: 'center', gap: rs(Spacing.sm) },
  btnTxt:       { color: '#fff', fontWeight: FontWeight.bold },
  btnOutline:   { borderRadius: Radius.md, paddingVertical: rs(Spacing.md), alignItems: 'center', borderWidth: 1.5 },
  btnOutlineTxt:{ fontWeight: FontWeight.bold },
  doneContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(Spacing.xl), gap: rs(Spacing.lg) },
  doneCircle:   { width: rs(100), height: rs(100), borderRadius: rs(50), borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark:    { width: rs(32), height: rs(18), borderLeftWidth: 3, borderBottomWidth: 3, transform: [{ rotate: '-45deg' }], marginTop: rs(6) },
  doneTitle:    { fontWeight: FontWeight.black },
  doneSub:      { textAlign: 'center' },
  doneBtns:     { flexDirection: 'row', gap: rs(Spacing.md), width: '100%' },
});

export default NuevoSelloScreen;
