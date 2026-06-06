import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
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
import NfcSheet from '../components/NfcSheet';
import Icon from '../components/Icon';
import { parseTrama, buildSignPayload } from '../utils/tramaParser';
import { extractEmbedding } from '../utils/embedding';

import { hashTrama } from '../utils/hash';
import { recoverSigner } from '../services/walletService';
import { useNfcNdefReader } from '../hooks/useNfcNdefReader';
import { insertValidacion } from '../db/validacionesRepository';
import { getWhitelist, getWhitelistByAddress } from '../db/whitelistRepository';

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
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const [nfcSheet,  setNfcSheet]  = useState(false);
  const [nfcStatus, setNfcStatus] = useState('waiting');
  const [nfcMsg,    setNfcMsg]    = useState('');
  const [resultado, setResultado] = useState(null);

  const { readTag } = useNfcNdefReader();
  const { pause, resume } = useNfcGuardControl();

  React.useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  const handleReset = () => {
    setStep(STEP_SCAN); setScanned(false); setParsed(null); setFaceEmbedding(null);
    setNfcStatus('waiting'); setNfcMsg(''); setResultado(null);
  };

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = parseTrama(data);
    // parseTrama valida el patrón: tipo 0/1, número 11/8 dígitos, fecha YYMMDD, (10)..(17)
    if (!result) { setScanned(false); showToast('QR no tiene el formato esperado', 'error'); return; }
    setParsed(result);
    // Extraer el face embedding del textoLibre si el documento lo incluye
    // (formato FD:B64:... comprimido, o FD:... legacy). null si no hay foto.
    setFaceEmbedding(extractEmbedding(result.textoLibre));
    setStep(STEP_NFC);
    // Patrón correcto → lanzar el lector NFC directamente, sin botón intermedio
    setTimeout(() => handleReadNfc(), 350);
  };

  const handleReadNfc = async () => {
    setNfcSheet(true);
    setNfcStatus('waiting');
    setNfcMsg('');

    await pause();  // liberar canal NFC para leer
    const result = await readTag(() => setNfcStatus('reading'));  // tag detectado → procesando
    if (!result.success) {
      setNfcStatus('error');
      setNfcMsg(result.error || 'No se pudo leer el tag');
      return;
    }

    const firmaHex  = (result.text || '').trim();
    let verified    = false;
    let signer      = null;

    // Firma válida: 130 chars hex (64 bytes firma + 1 byte recovery)
    const firmaValida = /^[0-9a-fA-F]{130}$/.test(firmaHex);

    if (!firmaValida) {
      const res = {
        valido: false, firmante: null, address: null,
        firmaHex, nfcUid: result.uid,
        detalle: firmaHex.length === 0
          ? 'El tag no contiene una firma'
          : `Firma con formato inválido (${firmaHex.length} chars, se esperaban 130)`,
      };
      setResultado(res);
      setNfcStatus('error');
      setNfcMsg('Firma inválida en el tag');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      insertValidacion({
        trama_hash: hashTrama(parsed.raw),
        trama: parsed.raw, doc_id: parsed.docId, firmante_id: parsed.id,
        tipo_doc: parsed.tipo === '1' ? 'DNI' : 'RUC', num_id: parsed.numero,
        fecha_venc: parsed.fecha, texto_libre: parsed.textoLibre,
        firma_hex: firmaHex, address_found: '',
        resultado: 'invalido', detalle: res.detalle, nfc_uid: result.uid,
      });
      return;
    }

    const whitelist = getWhitelist();
    if (whitelist.length === 0) {
      const res = {
        valido: false, firmante: null, address: null,
        firmaHex, nfcUid: result.uid,
        detalle: 'No hay firmantes en la lista blanca. Ve a Wallet y sincroniza primero.',
      };
      setResultado(res);
      setNfcStatus('error');
      setNfcMsg('Lista blanca vacía — sincroniza en Wallet');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Mostrar que está verificando (recoverSigner es la operación cripto cara)
    setNfcMsg('Verificando firma...');
    // Ceder un frame para que la UI pinte el mensaje antes del cálculo bloqueante
    await new Promise(r => setTimeout(r, 50));

    const payload    = buildSignPayload(parsed.raw, result.uid);
    const candidates = recoverSigner(payload, firmaHex);
    for (const addr of candidates) {
      const match = getWhitelistByAddress(addr);
      if (match) { verified = true; signer = match; break; }
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
    resume();  // reactivar captura NFC
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
            <DataRow label="Rostro" value={faceEmbedding ? `✓ incluido (${faceEmbedding.length} pts)` : 'sin datos faciales'} theme={theme} />
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
          {!nfcSheet && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.success }]} onPress={handleReadNfc}>
              <View style={styles.btnRow}>
                <Icon name="nfc" size={RFontSize.lg} color="#fff" />
                <Text style={[styles.btnTxt, { fontSize: RFontSize.lg }]}>Reintentar lectura NFC</Text>
              </View>
            </TouchableOpacity>
          )}
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
            {faceEmbedding && <DataRow label="Rostro" value={`✓ ${faceEmbedding.length} puntos faciales`} theme={theme} />}
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
