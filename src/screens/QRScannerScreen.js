/**
 * screens/QRScannerScreen.js
 * ──────────────────────────────────────────────────────────
 * Lector QR/Barcode con parser de trama stamping NFC:
 *
 *   {tipo}{numId}{yymmdd}(10){firmante}(17){docId}(0){textoLibre}
 *
 *   tipo:      0 = RUC (11 dígitos) | 1 = DNI (8 dígitos)
 *   numId:     número de identidad
 *   yymmdd:    fecha de vencimiento (6 dígitos)
 *   (10)       separador firmante
 *   firmante:  ID numérico del firmante
 *   (17)       separador docId
 *   docId:     identificador del documento (string libre)
 *   (0)        separador texto libre
 *   textoLibre: campo opcional
 *
 * Ejemplo:
 *   110475646261220(10)29(17)SO2938-2026(0)Contrato
 *
 * Flujo:
 *  1. Escanear QR o Barcode
 *  2. Parsear trama
 *  3. SELECT * FROM personas WHERE id = <firmante>
 *  4a. Encontrado  → navegar a FirmarScreen con datos
 *  4b. No encontrado → mostrar "no autorizado"
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { getPersonaById } from '../db/personasRepository';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

// ─── Parser de la trama NFC ─────────────────────────────────
/**
 * Parsea la trama: {tipo}{numId}{yymmdd}(10){firmante}(17){docId}(0){textoLibre}
 *
 * Retorna:
 * {
 *   tipo,        // '0' | '1'
 *   numero,      // numId string
 *   fecha,       // 'DD/MM/YYYY' para display
 *   id,          // firmante (number) — usado para lookup en DB
 *   docId,       // string
 *   textoLibre,  // string | ''
 *   raw,         // trama original
 * }
 * o null si el formato es inválido.
 */
const parseTrama = (raw) => {
  try {
    const s = raw.trim();

    // 1. Tipo: primer carácter debe ser '0' o '1'
    const tipo = s[0];
    if (tipo !== '0' && tipo !== '1') return null;

    // 2. Longitud del numId según tipo
    const numLen = tipo === '1' ? 8 : 11;

    // 3. Extraer numId
    const numId = s.slice(1, 1 + numLen);
    if (numId.length !== numLen || !/^\d+$/.test(numId)) return null;

    // 4. Lo que queda después del numId
    const rest = s.slice(1 + numLen);

    // 5. Fecha yymmdd — primeros 6 caracteres de rest
    const fechaRaw = rest.slice(0, 6);
    if (!/^\d{6}$/.test(fechaRaw)) return null;
    const yy = fechaRaw.slice(0, 2);
    const mm = fechaRaw.slice(2, 4);
    const dd = fechaRaw.slice(4, 6);
    // Convertir a DD/MM/YYYY para display
    const fecha = `${dd}/${mm}/20${yy}`;

    // 6. Extraer firmante entre (10) y (17)
    const afterFecha = rest.slice(6);
    const sep10 = '(10)';
    const sep17 = '(17)';
    const sep0  = '(0)';

    const idx10 = afterFecha.indexOf(sep10);
    if (idx10 === -1) return null;

    const afterSep10 = afterFecha.slice(idx10 + sep10.length);
    const idx17 = afterSep10.indexOf(sep17);
    if (idx17 === -1) return null;

    const firmanteStr = afterSep10.slice(0, idx17);
    if (!/^\d+$/.test(firmanteStr)) return null;
    const firmante = parseInt(firmanteStr, 10);
    if (isNaN(firmante) || firmante <= 0) return null;

    // 7. Extraer docId y textoLibre entre (17) y (0)
    const afterSep17 = afterSep10.slice(idx17 + sep17.length);
    const idx0 = afterSep17.indexOf(sep0);

    let docId, textoLibre;
    if (idx0 === -1) {
      // No hay (0), todo lo que queda es docId
      docId      = afterSep17;
      textoLibre = '';
    } else {
      docId      = afterSep17.slice(0, idx0);
      textoLibre = afterSep17.slice(idx0 + sep0.length);
    }

    if (!docId) return null;

    return {
      tipo,
      numero:     numId,
      fecha,            // DD/MM/YYYY — compatible con FirmarScreen
      id:         firmante,
      docId,
      textoLibre,
      raw:        s,
    };
  } catch {
    return null;
  }
};

// ─── Componente principal ───────────────────────────────────
const QRScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,    setScanned]        = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [parseError, setParseError]     = useState(null);
  const [notAuth,    setNotAuth]        = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setParseError(null);
    setNotAuth(false);

    // 1. Parsear la trama
    const parsed = parseTrama(data);

    if (!parsed) {
      setParseError(
        `Código no reconocido.\n\nFormato esperado:\n{tipo}{numId}{yymmdd}(10){firmante}(17){docId}(0){texto}\n\nRecibido:\n"${data}"`
      );
      setProcessing(false);
      return;
    }

    // 2. Consultar la DB por ID del firmante
    try {
      const persona = getPersonaById(parsed.id);

      if (persona) {
        setProcessing(false);
        navigation.navigate('Firmar', {
          qrData:  parsed,
          persona: persona,
        });
        setTimeout(() => { setScanned(false); }, 1000);
      } else {
        setNotAuth(true);
        setProcessing(false);
      }
    } catch (err) {
      console.warn('[QRScanner] DB error:', err);
      setParseError('Error al consultar la base de datos.');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setProcessing(false);
    setParseError(null);
    setNotAuth(false);
  };

  // ── Sin permisos ──────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leer QR / Barcode</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
          <Text style={styles.permText}>Necesitamos acceso a la cámara para leer códigos.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Conceder permiso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error de parseo ───────────────────────────────────────
  if (parseError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leer QR / Barcode</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Código inválido</Text>
          <Text style={styles.errorText}>{parseError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
            <Text style={styles.retryBtnText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── No autorizado ─────────────────────────────────────────
  if (notAuth) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leer QR / Barcode</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.notAuthBadge}>
            <Text style={styles.notAuthIcon}>✕</Text>
          </View>
          <Text style={styles.notAuthTitle}>No autorizado</Text>
          <Text style={styles.notAuthText}>
            Este firmante no está registrado en el sistema.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
            <Text style={styles.retryBtnText}>Escanear otro código</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Vista de cámara ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leer QR / Barcode</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={Colors.accent} />
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.scanHint}>
              {processing ? 'Verificando...' : 'Apunta al QR o código de barras'}
            </Text>
            <Text style={styles.scanSubHint}>QR · Code128 · Code39 · EAN</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const FRAME_SIZE  = 260;
const CORNER_SIZE = 28;
const CORNER_W    = 3;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm+4, borderBottomWidth:1, borderBottomColor:Colors.bgBorder },
  backBtn: { paddingVertical:Spacing.xs, paddingHorizontal:Spacing.sm, width:70 },
  backBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  headerTitle: { flex:1, textAlign:'center', fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.textPrimary },
  cameraContainer: { flex:1, position:'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection:'column' },
  overlayTop: { flex:1, backgroundColor:'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection:'row', height:FRAME_SIZE },
  overlaySide: { flex:1, backgroundColor:'rgba(0,0,0,0.6)' },
  overlayBottom: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', paddingTop:Spacing.xl, gap: Spacing.xs },
  scanHint: { fontSize:FontSize.md, color:'white', textAlign:'center' },
  scanSubHint: { fontSize:FontSize.xs, color:'rgba(255,255,255,0.5)', letterSpacing:2, textTransform:'uppercase' },
  scanFrame: { width:FRAME_SIZE, height:FRAME_SIZE, position:'relative' },
  corner: { position:'absolute', width:CORNER_SIZE, height:CORNER_SIZE, borderColor:Colors.accent, borderWidth:0 },
  cornerTL: { top:0, left:0, borderTopWidth:CORNER_W, borderLeftWidth:CORNER_W },
  cornerTR: { top:0, right:0, borderTopWidth:CORNER_W, borderRightWidth:CORNER_W },
  cornerBL: { bottom:0, left:0, borderBottomWidth:CORNER_W, borderLeftWidth:CORNER_W },
  cornerBR: { bottom:0, right:0, borderBottomWidth:CORNER_W, borderRightWidth:CORNER_W },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
  centered: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:Spacing.xl, gap:Spacing.md },
  permIcon: { fontSize:48 },
  permTitle: { fontSize:FontSize.xl, fontWeight:FontWeight.bold, color:Colors.textPrimary, textAlign:'center' },
  permText: { fontSize:FontSize.md, color:Colors.textSecondary, textAlign:'center' },
  permBtn: { backgroundColor:Colors.accent, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.xl },
  permBtnText: { fontSize:FontSize.md, fontWeight:FontWeight.bold, color:Colors.bg },
  errorIcon: { fontSize:48 },
  errorTitle: { fontSize:FontSize.xl, fontWeight:FontWeight.bold, color:Colors.error },
  errorText: { fontSize:FontSize.sm, color:Colors.textSecondary, textAlign:'center', lineHeight:FontSize.sm*1.7, fontFamily:'monospace' },
  notAuthBadge: { width:80, height:80, borderRadius:40, backgroundColor:Colors.errorGlow, borderWidth:2, borderColor:Colors.errorDim, alignItems:'center', justifyContent:'center' },
  notAuthIcon: { fontSize:32, color:Colors.error, fontWeight:FontWeight.black },
  notAuthTitle: { fontSize:FontSize.xxl, fontWeight:FontWeight.black, color:Colors.error },
  notAuthText: { fontSize:FontSize.md, color:Colors.textSecondary, textAlign:'center' },
  retryBtn: { paddingVertical:Spacing.sm+4, paddingHorizontal:Spacing.xl, backgroundColor:Colors.bgSurface, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.bgBorder },
  retryBtnText: { fontSize:FontSize.md, color:Colors.textPrimary, fontWeight:FontWeight.medium },
});

export default QRScannerScreen;
