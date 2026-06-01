/**
 * App.js — Punto de entrada de la aplicación stamping.io RFID Reader
 * ──────────────────────────────────────────────────────────
 *
 * Árbol de componentes:
 *   <SafeAreaProvider>          ← Márgenes seguros (notch, home bar, etc.)
 *     <AppNavigator>            ← Stack de navegación
 *       ├── WelcomeScreen       ← Pantalla 1: Bienvenida
 *       └── ScannerScreen       ← Pantalla 2: Lector RFID real
 *
 * Nota: Este archivo es minimalista a propósito.
 * La lógica de negocio vive en hooks/ y screens/.
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
