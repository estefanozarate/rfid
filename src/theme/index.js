/**
 * theme/index.js
 * ──────────────────────────────────────────────────────────
 * Tokens de diseño globales para stamping.io RFID Reader.
 * Paleta oscura industrial con acento en cian eléctrico.
 */

export const Colors = {
  // Fondos
  bg:           '#0A0A0F',
  bgCard:       '#111118',
  bgSurface:    '#18181F',
  bgBorder:     '#2A2A38',

  // Acento principal — cian eléctrico
  accent:       '#00E5FF',
  accentDim:    '#00B8CC',
  accentGlow:   'rgba(0, 229, 255, 0.15)',
  accentGlow2:  'rgba(0, 229, 255, 0.05)',

  // Estado de éxito
  success:      '#00FF87',
  successDim:   '#00CC6A',
  successGlow:  'rgba(0, 255, 135, 0.12)',

  // Estado de error
  error:        '#FF4757',
  errorDim:     '#CC3344',
  errorGlow:    'rgba(255, 71, 87, 0.12)',

  // Estado de advertencia
  warning:      '#FFB800',
  warningGlow:  'rgba(255, 184, 0, 0.12)',

  // Texto
  textPrimary:  '#F0F0FF',
  textSecondary:'#8888AA',
  textMuted:    '#44445A',
  textAccent:   '#00E5FF',

  // Overlay
  overlay:      'rgba(0, 0, 0, 0.7)',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  full: 9999,
};

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  26,
  hero: 34,
};

export const FontWeight = {
  regular: '400',
  medium:  '500',
  semibold:'600',
  bold:    '700',
  black:   '900',
};
