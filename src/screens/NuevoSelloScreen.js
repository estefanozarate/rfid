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
import { parseTrama, buildSignPayload } from '../utils/tramaParser';
import { hashTrama } from '../utils/hash';
import { signPayload, hasWallet, hasPinSetup } from '../services/walletService';
import { useNfcWriter, useNfcUidReader } from '../hooks/useNfcWriter';
import { insertSello } from '../db/sellosRepository';

const useCameraPermissions = require('expo-camera').useCameraPermissions;

// Separador para vincular UID al payload
const UID_SEP = '|UID:';

// Payload que se firma = trama + separador + uid


const STEPS     = ['Escanear', 'Leer tag', 'Firmar', 'Sellar', 'Listo'];
const STEP_SCAN = 'Escanear';
const STEP_UID  = 'Leer tag';
const STEP_SIGN = 'Firmar';
const STEP_NFC  = 'Sellar';
const STEP_DONE = 'Listo';

const DataRow = ({ label, value, theme, mono }) => (
  <View style={styles.dataRow}>
    <Text style={[styles.dataLabel, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>{label}</Text>
    <Text style={[styles.dataValue, { color: theme.textPrimary, fontSize: mono ? RFontSize.xs : RFontSize.sm, fontFamily: mono ? 'monospace' : undefined }]} numberOfLines={1}>
      {String(value || '—')}
    </Text>
  </View>
);

const NuevoSelloScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { showToast }     = useToast();
  const [permission, requestPermission] = useCameraPermissions();

  const [step,      setStep]      = useState(STEP_SCAN);
  const [scanned,   setScanned]   = useState(false);
  const [parsed,    setParsed]    = useState(null);
  const [tagUid,    setTagUid]    = useState(null);
  const [firmaHex,  setFirmaHex]  = useState('');
  const [signing,   setSigning]   = useState(false);
  const [signError, setSignError] = useState('');
  const [pinModal,  setPinModal]  = useState(false);
  const [nfcSheet,  setNfcSheet]  = useState(false);
  const [nfcStatus, setNfcStatus] = useState('waiting');
  const [nfcMsg,    setNfcMsg]    = useState('');
  // Para NfcSheet de lectura de UID
  const [uidSheet,  setUidSheet]  = useState(false);
  const [uidStatus, setUidStatus] = useState('waiting');

  const { writeTag }  = useNfcWriter();
  const { readUid }   = useNfcUidReader();

  React.useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  // ── Paso 1: Escanear QR ───────────────────────────────
  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    if (!result) { setScanned(false); showToast('Código no reconocido', 'error'); return; }
    setParsed(result);
    setStep(STEP_UID);
  };

  // ── Paso 2: Leer UID del tag ──────────────────────────
  const handleReadUid = async () => {
    setUidSheet(true);
    setUidStatus('waiting');
    const result = await readUid();
    if (result.success) {
      setTagUid(result.uid);
      setUidStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Avanzar automáticamente al cerrar el sheet
    } else {
      setUidStatus('error');
    }
  };

  const handleUidSheetClose = () => {
    setUidSheet(false);
    if (uidStatus === 'success') setStep(STEP_SIGN);
  };

  // ── Paso 3: PIN → Firmar ──────────────────────────────
  const handleSign = async () => {
    const ok     = await hasWallet();
    const hasPin = ok ? await hasPinSetup() : false;
    if (!ok || !hasPin) { setSignError('Configura tu wallet y PIN primero.'); return; }
    setPinModal(true);
  };

  const handlePinSuccess = async (pin) => {
    setPinModal(false);
    setSigning(true);
    setSignError('');
    try {
      // El payload incluye el UID del tag para vinculación criptográfica
      const payload = buildSignPayload(parsed.raw, tagUid);
      const firma   = await signPayload(payload, pin);
      setFirmaHex(firma);
      setStep(STEP_NFC);
    } catch (e) {
      setSignError(e.message);
    } finally { setSigning(false); }
  };

  // ── Paso 4: Escribir NFC ──────────────────────────────
  const handleWriteNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg('');
    const result = await writeTag(firmaHex);

    if (result.success) {
      // Verificar que el UID coincide con el que se usó para firmar
      if (result.uid !== tagUid) {
        setNfcStatus('error');
        setNfcMsg(`Tag diferente al que se leyó (UID: ${result.uid}). Usa el mismo tag.`);
        return;
      }
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
        firma_hex:   firmaHex,
        nfc_uid:     tagUid,
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

  const handleVerSellos  = () => navigation.getParent()?.navigate('SellarTab', { screen: 'Sellos' });
  const handleNuevoSello = () => {
    setStep(STEP_SCAN); setScanned(false); setParsed(null); setTagUid(null);
    setFirmaHex(''); setSignError(''); setNfcStatus('waiting'); setUidStatus('waiting');
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

      {/* PASO 2: Leer UID */}
      {step === STEP_UID && parsed && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>DOCUMENTO ESCANEADO</Text>
            <DataRow label="Doc ID"  value={parsed.docId}  theme={theme} />
            <DataRow label="Tipo"    value={parsed.tipo === '1' ? 'DNI' : 'RUC'} theme={theme} />
            <DataRow label="Número"  value={parsed.numero} theme={theme} />
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.accentGlow, borderColor: theme.accentDim || theme.bgBorder }]}>
            <Icon name="tag" size={RFontSize.xl} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.accent, fontSize: RFontSize.md }]}>
                Acerca el tag NFC
              </Text>
              <Text style={[styles.infoSub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
                Necesitamos leer el UID del tag para vincularlo a la firma
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleReadUid}>
            <View style={styles.btnRow}>
              <Icon name="nfc" size={RFontSize.lg} color="#fff" />
              <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Leer UID del tag</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 3: Confirmar y firmar */}
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
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>TAG VINCULADO</Text>
            <DataRow label="UID" value={tagUid} theme={theme} mono />
            <Text style={[styles.uidNote, { color: theme.textMuted, fontSize: RFontSize.xs - 1 }]}>
              La firma incluirá este UID — el sello solo verifica en este tag
            </Text>
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

      {/* PASO 4: Escribir NFC */}
      {step === STEP_NFC && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.bgBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.textMuted, fontSize: RFontSize.xs }]}>FIRMA GENERADA</Text>
            <Text style={[styles.firmaText, { color: theme.accent, fontSize: rs(9) }]} numberOfLines={4}>{firmaHex}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: theme.accentGlow, borderColor: theme.bgBorder }]}>
            <Icon name="tag" size={RFontSize.xl} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.accent, fontSize: RFontSize.md }]}>Usa el mismo tag</Text>
              <Text style={[styles.infoSub, { color: theme.textSecondary, fontSize: RFontSize.sm }]}>
                UID: {tagUid} — la firma está vinculada a este tag específico
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={handleWriteNfc}>
            <View style={styles.btnRow}>
              <Icon name="nfc" size={RFontSize.lg} color="#fff" />
              <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Escribir en tag NFC</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PASO 5: Listo */}
      {step === STEP_DONE && (
        <View style={styles.doneContainer}>
          <View style={[styles.doneCircle, { backgroundColor: theme.successGlow, borderColor: theme.success }]}>
            <View style={[styles.checkMark, { borderColor: theme.success }]} />
          </View>
          <Text style={[styles.doneTitle, { color: theme.success, fontSize: RFontSize.xxl }]}>¡Documento sellado!</Text>
          <Text style={[styles.doneSub, { color: theme.textSecondary, fontSize: RFontSize.md }]}>
            La firma fue escrita y vinculada al tag UID: {tagUid}
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

      {/* Sheet lectura de UID */}
      <NfcSheet
        visible={uidSheet}
        mode="read"
        status={uidStatus}
        message={uidStatus === 'success' ? `UID leído: ${tagUid}` : null}
        onCancel={handleUidSheetClose}
      />

      {/* Sheet escritura */}
      <NfcSheet visible={nfcSheet} mode="write" status={nfcStatus} message={nfcMsg} onCancel={handleSheetClose} />

      {/* Modal PIN */}
      <PinConfirmModal visible={pinModal} onSuccess={handlePinSuccess} onCancel={() => setPinModal(false)} theme={theme} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(Spacing.md), padding: rs(Spacing.xl) },
  content:      { padding: rs(Spacing.md), gap: rs(Spacing.md), paddingBottom: rs(Spacing.xxl) },
  card:         { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, gap: rs(6) },
  infoCard:     { borderRadius: Radius.lg, padding: rs(Spacing.md), borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: rs(Spacing.md) },
  infoTitle:    { fontWeight: FontWeight.bold },
  infoSub:      { marginTop: rs(2), lineHeight: rs(18) },
  cardTitle:    { fontWeight: FontWeight.bold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: rs(4) },
  dataRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(3) },
  dataLabel:    {},
  dataValue:    { fontWeight: FontWeight.medium, maxWidth: '58%', textAlign: 'right' },
  uidNote:      { marginTop: rs(4), lineHeight: rs(16) },
  firmaText:    { fontFamily: 'monospace', lineHeight: rs(16) },
  errTxt:       { textAlign: 'center', fontWeight: FontWeight.medium },
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
