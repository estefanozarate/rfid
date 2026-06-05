/**
 * theme/index.js
 * Sistema de colores basado en el logo Fileserver.
 *
 * Paleta extraída del logo:
 *   Azul:  #5090dc (color principal del logo)
 *   Rosa:  #dc96c8 (acento secundario del logo)
 *   Fondo: #1e2d2d (teal oscuro del logo)
 *
 * Regla 70/20/10:
 *   70% → fondo/superficie (neutro)
 *   20% → texto y bordes (secundario)
 *   10% → acento (azul del logo)
 */

const palette = {
  // Del logo
  blue:       '#5090dc',
  blueDark:   '#3a72c0',
  blueLight:  '#7ab0e8',
  blueGlow:   'rgba(80, 144, 220, 0.15)',

  rose:       '#dc96c8',
  roseGlow:   'rgba(220, 150, 200, 0.15)',

  tealDark:   '#1e2d2d',
  teal:       '#2a3f3f',

  // Neutros
  white:      '#FFFFFF',
  gray50:     '#F7F8FA',
  gray100:    '#EEF1F5',
  gray200:    '#DDE3EC',
  gray300:    '#C4CEDB',
  gray400:    '#8A9BB0',
  gray500:    '#5A6A7E',
  gray600:    '#3A4857',
  gray700:    '#253040',
  gray800:    '#192330',
  gray900:    '#0F161E',
  black:      '#000000',

  // Estados
  green:      '#22c55e',
  greenGlow:  'rgba(34, 197, 94, 0.12)',
  red:        '#ef4444',
  redGlow:    'rgba(239, 68, 68, 0.12)',
  amber:      '#f59e0b',
  amberGlow:  'rgba(245, 158, 11, 0.12)',
};

// ── Modo claro ────────────────────────────────────────────
export const LightTheme = {
  // 70% — fondos y superficies
  bg:          palette.gray50,
  bgCard:      palette.white,
  bgSurface:   palette.white,
  bgBorder:    palette.gray200,
  bgBorder2:   palette.gray300,

  // 20% — texto
  textPrimary:   palette.gray800,
  textSecondary: palette.gray500,
  textMuted:     palette.gray400,

  // 10% — acento (azul del logo)
  accent:      palette.blue,
  accentDark:  palette.blueDark,
  accentLight: palette.blueLight,
  accentGlow:  palette.blueGlow,

  // Rosa — solo para elementos especiales
  rose:        palette.rose,
  roseGlow:    palette.roseGlow,

  // Estados
  success:     palette.green,
  successGlow: palette.greenGlow,
  error:       palette.red,
  errorDim:    '#fca5a5',
  errorGlow:   palette.redGlow,
  warning:     palette.amber,
  warningGlow: palette.amberGlow,

  // Teal del logo para elementos de marca
  brand:       palette.tealDark,
  brandText:   palette.white,

  isDark: false,
};

// ── Modo oscuro ───────────────────────────────────────────
export const DarkTheme = {
  // 70% — fondos y superficies
  bg:          palette.gray900,
  bgCard:      palette.gray800,
  bgSurface:   palette.gray700,
  bgBorder:    palette.gray600,
  bgBorder2:   palette.gray500,

  // 20% — texto
  textPrimary:   '#EEF1F5',
  textSecondary: palette.gray400,
  textMuted:     palette.gray600,

  // 10% — acento (azul más brillante en oscuro)
  accent:      palette.blueLight,
  accentDark:  palette.blue,
  accentLight: '#a0c8f0',
  accentGlow:  'rgba(122, 176, 232, 0.2)',

  // Rosa
  rose:        '#f0b0d8',
  roseGlow:    'rgba(240, 176, 216, 0.15)',

  // Estados
  success:     '#4ade80',
  successGlow: 'rgba(74, 222, 128, 0.12)',
  error:       '#f87171',
  errorDim:    '#7f1d1d',
  errorGlow:   'rgba(248, 113, 113, 0.12)',
  warning:     '#fbbf24',
  warningGlow: 'rgba(251, 191, 36, 0.12)',

  // Teal del logo
  brand:       palette.teal,
  brandText:   palette.white,

  isDark: true,
};

// ── Tokens fijos (no cambian con el tema) ─────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
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
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '900',
};

// Default export — se sobreescribe por ThemeContext
export const Colors = LightTheme;
