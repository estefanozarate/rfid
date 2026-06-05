/**
 * screens/QRScannerScreen.js
 * ──────────────────────────────────────────────────────────
 * Lector QR con parser de cadena stamping.io:
 *   <tipo>.<numero>.<fecha>.<id>
 *   tipo: 0=RUC (11 dígitos) | 1=DNI (8 dígitos)
 *
 * Flujo:
 *  1. Escanear QR
 *  2. Parsear cadena
 *  3. SELECT * FROM personas WHERE id = <id>
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

// ─── Parser de la cadena QR ─────────────────────────────────
/**
 * Parsea una cadena con formato: <tipo>.<numero>.<fecha>.<id>
 * Retorna { tipo, numero, fecha, id } o null si el formato es inválido.
 */
const parseQRString = (raw) => {
  try {
    const parts = raw.trim().split('.');

    // Mínimo 4 partes: tipo, numero, fecha (puede tener / internos), id
    // La fecha tiene formato YYYY/MM/DD — ya viene como una sola parte
    // Ejemplo: "1.73873672.2026/12/28.8" → ["1","73873672","2026/12/28","8"]
    if (parts.length < 4) return null;

    const tipo   = parts[0];
    const numero = parts[1];
    const fecha  = parts[2];
    const id     = parseInt(parts[3], 10);

    // Validar tipo
    if (tipo !== '0' && tipo !== '1') return null;

    // Validar longitud del número
    const expectedLen = tipo === '1' ? 8 : 11;
    if (numero.length !== expectedLen) return null;

    // Validar que número sea solo dígitos
    if (!/^\d+$/.test(numero)) return null;

    // Validar id
    if (isNaN(id) || id <= 0) return null;

    // Validar formato de fecha YYYY/MM/DD
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(fecha)) return null;

    return { tipo, numero, fecha, id };
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

    // 1. Parsear la cadena
    const parsed = parseQRString(data);

    if (!parsed) {
      setParseError(`QR no reconocido.\nFormato esperado: tipo.numero.fecha.id\nRecibido: "${data}"`);
      setProcessing(false);
      return;
    }

    // 2. Consultar la DB
    try {
      const persona = getPersonaById(parsed.id);

      if (persona) {
        // 3a. Persona encontrada → navegar a FirmarScreen
        setProcessing(false);
        navigation.navigate('Firmar', {
          qrData:  parsed,
          persona: persona,
        });
        // Reset para cuando vuelva
        setTimeout(() => { setScanned(false); }, 1000);
      } else {
        // 3b. No encontrada
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
          <Text style={styles.headerTitle}>Leer QR</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
          <Text style={styles.permText}>Necesitamos acceso a la cámara para leer códigos QR.</Text>
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
          <Text style={styles.headerTitle}>Leer QR</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>QR inválido</Text>
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
          <Text style={styles.headerTitle}>Leer QR</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.notAuthBadge}>
            <Text style={styles.notAuthIcon}>✕</Text>
          </View>
          <Text style={styles.notAuthTitle}>No autorizado</Text>
          <Text style={styles.notAuthText}>
            Este usuario no está autorizado para firmar.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
            <Text style={styles.retryBtnText}>Escanear otro QR</Text>
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
        <Text style={styles.headerTitle}>Leer QR</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
              {processing ? 'Verificando...' : 'Apunta la cámara al código QR'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const FRAME_SIZE  = 240;
const CORNER_SIZE = 24;
const CORNER_W    = 3;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.md, paddingVertical:Spacing.sm+4, borderBottomWidth:1, borderBottomColor:Colors.bgBorder },
  backBtn: { paddingVertical:Spacing.xs, paddingHorizontal:Spacing.sm, width:70 },
  backBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
  headerTitle: { flex:1, textAlign:'center', fontSize:FontSize.lg, fontWeight:FontWeight.bold, color:Colors.textPrimary },

  // Cámara
  cameraContainer: { flex:1, position:'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection:'column' },
  overlayTop: { flex:1, backgroundColor:'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection:'row', height:FRAME_SIZE },
  overlaySide: { flex:1, backgroundColor:'rgba(0,0,0,0.6)' },
  overlayBottom: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', paddingTop:Spacing.xl },
  scanHint: { fontSize:FontSize.md, color:'white', textAlign:'center' },

  // Marco QR
  scanFrame: { width:FRAME_SIZE, height:FRAME_SIZE, position:'relative' },
  corner: { position:'absolute', width:CORNER_SIZE, height:CORNER_SIZE, borderColor:Colors.accent, borderWidth:0 },
  cornerTL: { top:0, left:0, borderTopWidth:CORNER_W, borderLeftWidth:CORNER_W },
  cornerTR: { top:0, right:0, borderTopWidth:CORNER_W, borderRightWidth:CORNER_W },
  cornerBL: { bottom:0, left:0, borderBottomWidth:CORNER_W, borderLeftWidth:CORNER_W },
  cornerBR: { bottom:0, right:0, borderBottomWidth:CORNER_W, borderRightWidth:CORNER_W },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },

  // Centrado (estados)
  centered: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:Spacing.xl, gap:Spacing.md },

  // Permisos
  permIcon: { fontSize:48 },
  permTitle: { fontSize:FontSize.xl, fontWeight:FontWeight.bold, color:Colors.textPrimary, textAlign:'center' },
  permText: { fontSize:FontSize.md, color:Colors.textSecondary, textAlign:'center' },
  permBtn: { backgroundColor:Colors.accent, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.xl },
  permBtnText: { fontSize:FontSize.md, fontWeight:FontWeight.bold, color:Colors.bg },

  // Error
  errorIcon: { fontSize:48 },
  errorTitle: { fontSize:FontSize.xl, fontWeight:FontWeight.bold, color:Colors.error },
  errorText: { fontSize:FontSize.sm, color:Colors.textSecondary, textAlign:'center', lineHeight:FontSize.sm*1.7 },

  // No autorizado
  notAuthBadge: { width:80, height:80, borderRadius:40, backgroundColor:Colors.errorGlow, borderWidth:2, borderColor:Colors.errorDim, alignItems:'center', justifyContent:'center' },
  notAuthIcon: { fontSize:32, color:Colors.error, fontWeight:FontWeight.black },
  notAuthTitle: { fontSize:FontSize.xxl, fontWeight:FontWeight.black, color:Colors.error },
  notAuthText: { fontSize:FontSize.md, color:Colors.textSecondary, textAlign:'center' },

  // Retry
  retryBtn: { paddingVertical:Spacing.sm+4, paddingHorizontal:Spacing.xl, backgroundColor:Colors.bgSurface, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.bgBorder },
  retryBtnText: { fontSize:FontSize.md, color:Colors.textPrimary, fontWeight:FontWeight.medium },
});

export default QRScannerScreen;