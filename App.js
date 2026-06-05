import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import { useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';

// Inner necesita acceso al tema para el ToastProvider
const Inner = () => {
  const { theme } = useTheme();
  return (
    <ToastProvider theme={theme}>
      <AppNavigator />
    </ToastProvider>
  );
};

export default function App() {
  useEffect(() => { initDatabase(); }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Inner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
