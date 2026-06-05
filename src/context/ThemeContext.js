/**
 * context/ThemeContext.js
 * Proveedor de tema claro/oscuro con persistencia en AsyncStorage.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from '../theme';

const ThemeContext = createContext({
  theme:      LightTheme,
  isDark:     false,
  toggleTheme:() => {},
});

const THEME_KEY = 'nfc_theme_pref';

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); // 'dark' | 'light'
  const [isDark, setIsDark] = useState(false); // default claro

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val !== null) setIsDark(val === 'dark');
    }).catch(() => {});
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try { await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch {}
  };

  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
