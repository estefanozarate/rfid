/**
 * components/Icon.js
 * Sistema de iconos SVG vectoriales puros con View/Path simulado.
 * Sin dependencias nativas — solo React Native primitivas.
 *
 * Uso: <Icon name="seal" size={22} color={Colors.accent} />
 */
import React from 'react';
import { View } from 'react-native';

// Cada icono es una función que recibe { color, size } y retorna JSX con View
const icons = {

  // Casa
  home: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: s*0.5, borderRightWidth: s*0.5, borderBottomWidth: s*0.42, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
      <View style={{ width: s*0.72, height: s*0.5, borderWidth: 1.8, borderColor: c, borderTopWidth: 0 }}>
        <View style={{ width: s*0.24, height: s*0.32, borderWidth: 1.5, borderColor: c, position: 'absolute', bottom: 0, alignSelf: 'center' }} />
      </View>
    </View>
  ),

  // Candado cerrado
  lock: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', gap: 0 }}>
      {/* arco superior */}
      <View style={{ width: s*0.5, height: s*0.3, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: c, borderTopLeftRadius: s*0.25, borderTopRightRadius: s*0.25, borderBottomWidth: 0 }} />
      {/* cuerpo */}
      <View style={{ width: s*0.72, height: s*0.45, borderWidth: 2, borderColor: c, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: s*0.16, height: s*0.16, borderRadius: s*0.08, borderWidth: 1.5, borderColor: c }} />
        <View style={{ width: 2, height: s*0.14, backgroundColor: c, marginTop: 1 }} />
      </View>
    </View>
  ),

  // Candado abierto
  lockOpen: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 0, left: s*0.05, width: s*0.5, height: s*0.3, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: c, borderTopLeftRadius: s*0.25, borderTopRightRadius: s*0.25 }} />
      <View style={{ width: s*0.72, height: s*0.45, borderWidth: 2, borderColor: c, borderRadius: 3, position: 'absolute', bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: s*0.16, height: s*0.16, borderRadius: s*0.08, borderWidth: 1.5, borderColor: c }} />
        <View style={{ width: 2, height: s*0.14, backgroundColor: c, marginTop: 1 }} />
      </View>
    </View>
  ),

  // Escudo con check
  shield: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.73, height: s*0.59, borderWidth: 2, borderColor: c, borderRadius: 3, borderBottomWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: s*0.27, height: s*0.14, borderLeftWidth: 1.8, borderBottomWidth: 1.8, borderColor: c, transform: [{ rotate: '-45deg' }], marginTop: s*0.08 }} />
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: s*0.36, borderRightWidth: s*0.36, borderTopWidth: s*0.27, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c }} />
    </View>
  ),

  // Check círculo
  checkCircle: ({ c, s }) => (
    <View style={{ width: s, height: s, borderRadius: s*0.5, borderWidth: 2, borderColor: c, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.36, height: s*0.2, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: c, transform: [{ rotate: '-45deg' }], marginTop: s*0.06 }} />
    </View>
  ),

  // X círculo
  xCircle: ({ c, s }) => (
    <View style={{ width: s, height: s, borderRadius: s*0.5, borderWidth: 2, borderColor: c, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: s*0.4, height: 2, backgroundColor: c, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: s*0.4, height: 2, backgroundColor: c, transform: [{ rotate: '-45deg' }] }} />
    </View>
  ),

  // Papelera
  trash: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
      {/* tapa */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <View style={{ width: s*0.14, height: 2, backgroundColor: c, borderRadius: 1 }} />
        <View style={{ width: s*0.5, height: s*0.14, borderWidth: 1.5, borderColor: c, borderRadius: 2 }} />
        <View style={{ width: s*0.14, height: 2, backgroundColor: c, borderRadius: 1 }} />
      </View>
      {/* cuerpo */}
      <View style={{ width: s*0.6, height: s*0.6, borderWidth: 1.8, borderColor: c, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
        {/* líneas internas */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: s*0.1 }}>
          {[0,1,2].map(i => <View key={i} style={{ width: 1.5, height: s*0.32, backgroundColor: c, opacity: 0.7 }} />)}
        </View>
      </View>
    </View>
  ),

  // Refresh / reescribir
  refresh: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.7, height: s*0.7, borderRadius: s*0.35, borderWidth: 2, borderColor: c, borderRightColor: 'transparent', transform: [{ rotate: '45deg' }] }} />
      {/* flecha */}
      <View style={{ position: 'absolute', top: s*0.04, right: s*0.1, width: 0, height: 0, borderLeftWidth: s*0.15, borderRightWidth: 0, borderBottomWidth: s*0.15, borderLeftColor: c, borderRightColor: 'transparent', borderBottomColor: 'transparent' }} />
    </View>
  ),

  // NFC / señal
  nfc: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {[s*0.65, s*0.82, s*0.98].map((r, i) => (
        <View key={i} style={{ position: 'absolute', width: r, height: r, borderRadius: r*0.5, borderWidth: 1.5, borderColor: c, opacity: 1 - i*0.25 }} />
      ))}
      <View style={{ width: s*0.18, height: s*0.18, borderRadius: s*0.09, backgroundColor: c }} />
    </View>
  ),

  // Wallet
  wallet: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.9, height: s*0.6, borderWidth: 2, borderColor: c, borderRadius: 3, alignItems: 'flex-end', justifyContent: 'center', paddingRight: s*0.08 }}>
        <View style={{ position: 'absolute', top: -s*0.22, left: s*0.08, width: s*0.44, height: s*0.22, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: c, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
        <View style={{ width: s*0.35, height: s*0.35, borderRadius: s*0.175, borderWidth: 1.8, borderColor: c, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s*0.13, height: s*0.13, borderRadius: s*0.065, backgroundColor: c }} />
        </View>
      </View>
    </View>
  ),

  // Sello / estrella
  seal: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.82, height: s*0.82, borderRadius: s*0.41, borderWidth: 2, borderColor: c, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: s*0.36, height: s*0.36, borderRadius: s*0.18, borderWidth: 1.5, borderColor: c }} />
      </View>
      <View style={{ position: 'absolute', width: s*0.22, height: s*0.12, borderLeftWidth: 1.8, borderBottomWidth: 1.8, borderColor: c, transform: [{ rotate: '-45deg' }] }} />
    </View>
  ),

  // Flecha atrás
  back: ({ c, s }) => (
    <View style={{ width: s, height: s, justifyContent: 'center' }}>
      <View style={{ width: s*0.45, height: s*0.45, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: c, transform: [{ rotate: '45deg' }], marginLeft: s*0.3 }} />
      <View style={{ position: 'absolute', width: s*0.7, height: 2.5, backgroundColor: c, left: s*0.15, borderRadius: 2 }} />
    </View>
  ),

  // Chevron derecha
  chevronRight: ({ c, s }) => (
    <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: s*0.35, height: s*0.35, borderRightWidth: 2.5, borderTopWidth: 2.5, borderColor: c, transform: [{ rotate: '45deg' }] }} />
    </View>
  ),

  // Más (+) para FAB
  plus: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: s*0.7, height: 3, backgroundColor: c, borderRadius: 2 }} />
      <View style={{ position: 'absolute', width: 3, height: s*0.7, backgroundColor: c, borderRadius: 2 }} />
    </View>
  ),

  // Documento
  document: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.68, height: s*0.82, borderWidth: 2, borderColor: c, borderRadius: 3, paddingTop: s*0.14, paddingHorizontal: s*0.1, gap: s*0.1 }}>
        <View style={{ position: 'absolute', top: 0, right: 0, width: s*0.22, height: s*0.22, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: c }} />
        {[0.55, 0.75, 0.9].map((w, i) => (
          <View key={i} style={{ width: `${w*100}%`, height: 1.5, backgroundColor: c, opacity: 0.6 }} />
        ))}
      </View>
    </View>
  ),

  // Sync / download lista
  sync: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.7, height: s*0.7, borderRadius: s*0.35, borderWidth: 2, borderColor: c, borderBottomColor: 'transparent', transform: [{ rotate: '-30deg' }] }} />
      <View style={{ position: 'absolute', bottom: s*0.06, left: s*0.12, width: 0, height: 0, borderLeftWidth: s*0.14, borderRightWidth: s*0.14, borderTopWidth: s*0.18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c }} />
    </View>
  ),

  // Tag NFC (rectángulo redondeado con ondas)
  tag: ({ c, s }) => (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s*0.7, height: s*0.82, borderWidth: 2, borderColor: c, borderRadius: s*0.14, alignItems: 'center', justifyContent: 'center', gap: s*0.08 }}>
        <View style={{ width: s*0.3, height: s*0.3, borderRadius: s*0.15, borderWidth: 1.5, borderColor: c }} />
        <View style={{ width: s*0.35, height: 1.5, backgroundColor: c, opacity: 0.5 }} />
        <View style={{ width: s*0.28, height: 1.5, backgroundColor: c, opacity: 0.35 }} />
      </View>
    </View>
  ),
};

// ── Componente principal ──────────────────────────────────
const Icon = ({ name, size = 22, color = '#FFFFFF' }) => {
  const fn = icons[name];
  if (!fn) {
    console.warn(`[Icon] Icono no encontrado: "${name}"`);
    return null;
  }
  return fn({ c: color, s: size });
};

export default Icon;
export { icons };
