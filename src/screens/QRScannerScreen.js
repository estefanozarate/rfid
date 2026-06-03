import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Animated, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme';

const QRScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [result,  setResult]            = useState(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  // Solicitar permisos al montar
  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setResult(data);
    // Animación de éxito
    Animated.spring(successAnim, {
      toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
    }).start();
  };

  const handleReset = () => {
    setScanned(false);
    setResult(null);
    successAnim.setValue(0);
  };

  // ── Sin permisos ──────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.permText}>Solicitando permisos de cámara...</Text>
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

  // ── Resultado escaneado ───────────────────────────────────
  if (scanned && result) {
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

        <ScrollView contentContainerStyle={styles.resultContainer}>
          <Animated.View style={[styles.successBadge, {
            opacity: successAnim,
            transform: [{ scale: successAnim.interpolate({ inputRange:[0,1], outputRange:[0.8,1] }) }],
          }]}>
            <Text style={styles.successIcon}>✓</Text>
          </Animated.View>

          <Text style={styles.resultTitle}>QR Leído</Text>
          <Text style={styles.resultSubtitle}>Contenido del código:</Text>

          {/* Contenido del QR */}
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>DATOS</Text>
            <Text style={styles.resultContent} selectable>{result}</Text>
          </View>

          {/* Longitud del contenido */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{result.length} caracteres</Text>
            </View>
            {result.startsWith('http') && (
              <View style={[styles.metaChip, { borderColor: Colors.accent }]}>
                <Text style={[styles.metaText, { color: Colors.accent }]}>URL detectada</Text>
              </View>
            )}
          </View>

          {/* Botón Firmar ECDSA — sin lógica por ahora */}
          <TouchableOpacity style={styles.ecdsaBtn} activeOpacity={0.85}>
            <Text style={styles.ecdsaBtnIcon}>🔐</Text>
            <Text style={styles.ecdsaBtnText}>Firmar usando ECDSA</Text>
          </TouchableOpacity>

          {/* Botón escanear de nuevo */}
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Escanear otro QR</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Vista de la cámara ────────────────────────────────────
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

      {/* Cámara */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />

        {/* Overlay con marco de escaneo */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            {/* Marco del QR */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.scanHint}>Apunta la cámara al código QR</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const FRAME_SIZE = 240;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:Colors.bg },

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

  // Marco del QR
  scanFrame: { width:FRAME_SIZE, height:FRAME_SIZE, position:'relative' },
  corner: { position:'absolute', width:CORNER_SIZE, height:CORNER_SIZE, borderColor:Colors.accent, borderWidth:0 },
  cornerTL: { top:0, left:0, borderTopWidth:CORNER_WIDTH, borderLeftWidth:CORNER_WIDTH },
  cornerTR: { top:0, right:0, borderTopWidth:CORNER_WIDTH, borderRightWidth:CORNER_WIDTH },
  cornerBL: { bottom:0, left:0, borderBottomWidth:CORNER_WIDTH, borderLeftWidth:CORNER_WIDTH },
  cornerBR: { bottom:0, right:0, borderBottomWidth:CORNER_WIDTH, borderRightWidth:CORNER_WIDTH },

  // Sin permisos
  centered: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:Spacing.xl, gap:Spacing.md },
  permIcon: { fontSize:48 },
  permTitle: { fontSize:FontSize.xl, fontWeight:FontWeight.bold, color:Colors.textPrimary, textAlign:'center' },
  permText: { fontSize:FontSize.md, color:Colors.textSecondary, textAlign:'center' },
  permBtn: { backgroundColor:Colors.accent, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.xl, marginTop:Spacing.sm },
  permBtnText: { fontSize:FontSize.md, fontWeight:FontWeight.bold, color:Colors.bg },

  // Resultado
  resultContainer: { padding:Spacing.xl, alignItems:'center', gap:Spacing.lg },
  successBadge: { width:80, height:80, borderRadius:40, backgroundColor:Colors.successGlow, borderWidth:2, borderColor:Colors.success, alignItems:'center', justifyContent:'center' },
  successIcon: { fontSize:36, color:Colors.success },
  resultTitle: { fontSize:FontSize.xxl, fontWeight:FontWeight.bold, color:Colors.textPrimary },
  resultSubtitle: { fontSize:FontSize.md, color:Colors.textSecondary },
  resultCard: { width:'100%', backgroundColor:Colors.bgCard, borderRadius:Radius.lg, padding:Spacing.md, borderWidth:1, borderColor:Colors.bgBorder, gap:Spacing.xs },
  resultLabel: { fontSize:FontSize.xs, fontWeight:FontWeight.bold, color:Colors.textMuted, letterSpacing:1.5 },
  resultContent: { fontSize:FontSize.md, color:Colors.textPrimary, fontFamily:'monospace', lineHeight:FontSize.md*1.6 },
  metaRow: { flexDirection:'row', gap:Spacing.xs, flexWrap:'wrap', justifyContent:'center' },
  metaChip: { paddingHorizontal:Spacing.sm, paddingVertical:Spacing.xs, backgroundColor:Colors.bgSurface, borderRadius:Radius.full, borderWidth:1, borderColor:Colors.bgBorder },
  metaText: { fontSize:FontSize.xs, color:Colors.textSecondary },

  // Botón ECDSA
  ecdsaBtn: { width:'100%', flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, backgroundColor:Colors.bgSurface, borderRadius:Radius.md, paddingVertical:Spacing.md, borderWidth:1.5, borderColor:Colors.accent },
  ecdsaBtnIcon: { fontSize:20 },
  ecdsaBtnText: { fontSize:FontSize.md, fontWeight:FontWeight.semibold, color:Colors.accent },

  // Reset
  resetBtn: { width:'100%', paddingVertical:Spacing.md, alignItems:'center', backgroundColor:Colors.bgSurface, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.bgBorder },
  resetBtnText: { fontSize:FontSize.md, color:Colors.textSecondary, fontWeight:FontWeight.medium },
});

export default QRScannerScreen;