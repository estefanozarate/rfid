/**
 * utils/responsive.js
 * Tipografía y espaciado adaptados al PixelRatio y resolución del dispositivo.
 */
import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base de referencia: iPhone 14 = 390px logical width
const BASE_WIDTH  = 390;
const scale       = width / BASE_WIDTH;
const isTablet    = width >= 768;

/**
 * Escala un tamaño de fuente según la pantalla.
 * Clampea para no ir demasiado pequeño ni demasiado grande.
 */
export const rf = (size) => {
  const scaled = size * Math.min(scale, isTablet ? 1.4 : 1.15);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Escala espaciado
 */
export const rs = (size) => Math.round(size * Math.min(scale, 1.3));

export const isTabletDevice = isTablet;
export const screenWidth    = width;
export const screenHeight   = height;

// Tamaños de fuente responsivos listos para usar
export const RFontSize = {
  xs:   rf(11),
  sm:   rf(13),
  md:   rf(15),
  lg:   rf(17),
  xl:   rf(20),
  xxl:  rf(24),
  hero: rf(32),
};
