/**
 * components/QRScanner.js
 * Visor de cámara responsivo para QR y Barcode.
 * El frame de esquinas ocupa toda la zona de cámara menos el hint inferior.
 * No hay un cuadradito pequeño centrado — el área útil ES toda la cámara.
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { RFontSize, rs } from '../utils/responsive';

const { width, height } = Dimensions.get('window');

// Altura del hint inferior (texto + padding)
const HINT_H = rs(72);
// Margen de las esquinas respecto al borde de la cámara
const MARGIN  = rs(20);
// Tamaño del trazo de esquina
const CW      = rs(28);
const CT      = rs(3.5);

const Corner = ({ style, color }) => (
  <View style={[styles.corner, style, { borderColor: color }]} />
);

const QRScanner = ({
  onScanned,
  hint = 'Apunta al QR o código de barras',
  subhint = 'QR · Code128 · Code39 · EAN',
  cornerColor = '#5090dc',
  disabled = false,
}) => {
  return (
    <View style={styles.container}>

      {/* Cámara ocupa todo */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'],
        }}
        onBarcodeScanned={disabled ? undefined : onScanned}
      />

      {/* Overlay oscuro solo en la franja inferior (hint) */}
      <View style={styles.hintOverlay}>
        <Text style={[styles.hintText, { fontSize: RFontSize.md }]}>{hint}</Text>
        {subhint ? (
          <Text style={[styles.subhintText, { fontSize: RFontSize.xs }]}>{subhint}</Text>
        ) : null}
      </View>

      {/* Esquinas en los bordes del área de cámara (con margen) */}
      {/* Top-left */}
      <Corner
        color={cornerColor}
        style={{ top: MARGIN, left: MARGIN, borderTopWidth: CT, borderLeftWidth: CT, borderRightWidth: 0, borderBottomWidth: 0 }}
      />
      {/* Top-right */}
      <Corner
        color={cornerColor}
        style={{ top: MARGIN, right: MARGIN, borderTopWidth: CT, borderRightWidth: CT, borderLeftWidth: 0, borderBottomWidth: 0 }}
      />
      {/* Bottom-left */}
      <Corner
        color={cornerColor}
        style={{ bottom: HINT_H + MARGIN, left: MARGIN, borderBottomWidth: CT, borderLeftWidth: CT, borderTopWidth: 0, borderRightWidth: 0 }}
      />
      {/* Bottom-right */}
      <Corner
        color={cornerColor}
        style={{ bottom: HINT_H + MARGIN, right: MARGIN, borderBottomWidth: CT, borderRightWidth: CT, borderTopWidth: 0, borderLeftWidth: 0 }}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  hintOverlay: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          HINT_H,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             rs(4),
    paddingHorizontal: rs(16),
  },
  hintText: {
    color:      '#ffffff',
    fontWeight: '600',
    textAlign:  'center',
  },
  subhintText: {
    color:         'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign:     'center',
  },
  corner: {
    position:     'absolute',
    width:        CW,
    height:       CW,
    borderRadius: rs(3),
  },
});

export default QRScanner;
