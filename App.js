/**
 * App.js
 * ──────────────────────────────────────────────────────────
 * Punto de entrada. Inicializa la DB SQLite al arrancar.
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';

export default function App() {
  useEffect(() => {
    // Inicializa SQLite y crea tabla personas con seed
    initDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}