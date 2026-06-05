/**
 * components/QRDisplay.js
 * Genera y muestra un QR Code usando react-native-qrcode-svg si está disponible,
 * o una representación visual del address si no lo está.
 * Sin crashes por módulos faltantes.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RFontSize, rs } from '../utils/responsive';

let QRCode = null;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch (e) {
  console.log('[QRDisplay] react-native-qrcode-svg no disponible, usando fallback');
}

const QRDisplay = ({ value, size = 160, theme }) => {
  if (!value) return null;

  if (QRCode) {
    return (
      <View style={[styles.qrBox, { padding: rs(12) }]}>
        <QRCode
          value={value}
          size={size}
          color="#000000"
          backgroundColor="#ffffff"
        />
      </View>
    );
  }

  // Fallback: mostrar address formateado en bloques si no hay QRCode
  const chunks = value.match(/.{1,8}/g) || [];
  return (
    <View style={[styles.fallback, { width: size + rs(24), borderColor: theme?.bgBorder || '#dde4ed' }]}>
      <Text style={[styles.fallbackLabel, { color: theme?.textMuted || '#6b8099', fontSize: RFontSize.xs - 2 }]}>
        ADDRESS
      </Text>
      <View style={styles.chunksGrid}>
        {chunks.map((c, i) => (
          <Text key={i} style={[styles.chunk, { color: theme?.accent || '#5090dc', fontSize: rs(9) }]}>
            {c}
          </Text>
        ))}
      </View>
      <Text style={[styles.fallbackNote, { color: theme?.textMuted || '#6b8099', fontSize: rs(9) }]}>
        Instala react-native-qrcode-svg para ver el QR
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  qrBox:       { backgroundColor: '#ffffff', borderRadius: rs(10) },
  fallback:    { backgroundColor: '#ffffff', borderRadius: rs(10), borderWidth: 1, padding: rs(16), alignItems: 'center', gap: rs(8) },
  fallbackLabel:{ letterSpacing: 1.5, textTransform: 'uppercase' },
  chunksGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: rs(4) },
  chunk:       { fontFamily: 'monospace', letterSpacing: 0.5 },
  fallbackNote:{ textAlign: 'center', fontStyle: 'italic' },
});

export default QRDisplay;
