/**
 * components/Toast.js
 * Toast ligero que aparece arriba y desaparece solo.
 * Uso: const { showToast } = useToast();
 *      showToast('Copiado al portapapeles', 'success')
 */
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';

const { width } = Dimensions.get('window');
const ToastContext = createContext({ showToast: () => {} });

export const ToastProvider = ({ children, theme }) => {
  let insets = { top: 44 };
  try { insets = useSafeAreaInsets(); } catch (e) {}
  const [toast, setToast]  = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer   = useRef(null);

  const showToast = useCallback((message, type = 'info', duration = 2500) => {
    if (timer.current) clearTimeout(timer.current);

    setToast({ message, type });
    Animated.spring(opacity, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }, []);

  const t = theme;
  const typeConfig = {
    success: { bg: t.success,  icon: 'checkCircle', iconColor: t.bgSurface },
    error:   { bg: t.error,    icon: 'xCircle',     iconColor: t.bgSurface },
    info:    { bg: t.accent,   icon: 'nfc',         iconColor: t.bgSurface },
    warning: { bg: t.warning,  icon: 'lock',        iconColor: t.bgSurface },
  };

  const cfg = typeConfig[toast?.type] || typeConfig.info;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View style={[styles.toast, {
          top:             insets.top + 12,
          backgroundColor: cfg.bg,
          opacity,
          transform: [{ translateY: opacity.interpolate({ inputRange: [0,1], outputRange: [-20, 0] }) }],
        }]}>
          <Icon name={cfg.icon} size={16} color={cfg.iconColor} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position:      'absolute',
    top:           60,
    alignSelf:     'center',
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    paddingHorizontal: 18,
    paddingVertical:   10,
    borderRadius:  100,
    maxWidth:      width * 0.85,
    zIndex:        9999,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius:  8,
    elevation:     10,
  },
  toastText: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#fff',
  },
});
