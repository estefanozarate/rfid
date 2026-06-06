/**
 * AppNavigator.js
 *
 * Arquitectura de navegación:
 *
 *   Root Stack
 *   ├── Welcome
 *   ├── SetupWallet
 *   ├── SetupPin
 *   ├── PinLogin
 *   └── Main (Bottom Tabs)  ← pantallas principales
 *       ├── InicioTab   → InicioScreen
 *       ├── SellarTab   → SellosScreen        (solo lista)
 *       ├── ValidarTab  → ValidacionesScreen  (solo lista)
 *       └── WalletTab   → WalletStack
 *           └── WalletScreen
 *
 *   Las acciones NuevoSello y NuevaValidacion son MODALES
 *   sobre el Root Stack — no viven en ningún tab.
 *   Así el estado de los tabs nunca se contamina.
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

import { useTheme }                     from '../context/ThemeContext';
import { NfcGuardProvider }             from '../context/NfcGuardContext';
import { FontWeight }                   from '../theme';
import { RFontSize, rs }                from '../utils/responsive';
import Icon                             from '../components/Icon';

import WelcomeScreen         from '../screens/WelcomeScreen';
import SetupWalletScreen     from '../screens/SetupWalletScreen';
import SetupPinScreen        from '../screens/SetupPinScreen';
import PinLoginScreen        from '../screens/PinLoginScreen';
import InicioScreen          from '../screens/InicioScreen';
import SellosScreen          from '../screens/SellosScreen';
import ValidacionesScreen    from '../screens/ValidacionesScreen';
import WalletScreen          from '../screens/WalletScreen';
import NuevoSelloScreen      from '../screens/NuevoSelloScreen';
import NuevaValidacionScreen from '../screens/NuevaValidacionScreen';

const RootStack = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const TAB_H     = isTablet ? 72 : 62;

// ── Tab icon ──────────────────────────────────────────────
const TabIcon = ({ iconName, label, focused, theme }) => {
  const color = focused ? theme.accent : theme.textMuted;
  return (
    <View style={[tabSt.wrap, { width: width / 4 - rs(4) }]}>
      <Icon name={iconName} size={RFontSize.xl} color={color} />
      <Text
        style={[tabSt.label, { color, fontSize: RFontSize.xs }]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {label}
      </Text>
      {focused && <View style={[tabSt.dot, { backgroundColor: theme.accent }]} />}
    </View>
  );
};

const tabSt = StyleSheet.create({
  wrap:  { alignItems: 'center', justifyContent: 'center', paddingTop: rs(4), gap: rs(2) },
  label: { fontWeight: FontWeight.medium },
  dot:   { width: rs(4), height: rs(4), borderRadius: rs(2), marginTop: rs(1) },
});

// ── Wallet tiene su propio mini-stack para el header ─────
// WalletScreen se usa directamente como componente del tab

// ── Bottom Tabs — SOLO pantallas de lista ─────────────────
const MainTabs = () => {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:     false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.bgSurface,
          borderTopColor:  theme.bgBorder,
          borderTopWidth:  1,
          height:          TAB_H,
          paddingBottom:   0,
          paddingTop:      0,
        },
      }}
    >
      <Tab.Screen
        name="InicioTab"
        component={InicioScreen}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="home" label="Inicio" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen
        name="SellarTab"
        component={SellosScreen}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="seal" label="Sellos" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen
        name="ValidarTab"
        component={ValidacionesScreen}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="shield" label="Validados" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="wallet" label="Wallet" focused={focused} theme={theme} /> }}
      />
    </Tab.Navigator>
  );
};

// ── Root Stack ────────────────────────────────────────────
// NuevoSello y NuevaValidacion son modales sobre todo
const AppNavigator = () => {
  const { theme } = useTheme();
  const stackOpts = { headerShown: false, contentStyle: { backgroundColor: theme.bg } };

  return (
    <NavigationContainer>
      <NfcGuardProvider>
      <RootStack.Navigator screenOptions={stackOpts}>
        {/* Onboarding */}
        <RootStack.Screen name="Welcome"     component={WelcomeScreen} />
        <RootStack.Screen name="SetupWallet" component={SetupWalletScreen} options={{ animation: 'fade' }} />
        <RootStack.Screen name="SetupPin"    component={SetupPinScreen}    options={{ animation: 'slide_from_right' }} />
        <RootStack.Screen name="PinLogin"    component={PinLoginScreen}    options={{ animation: 'fade' }} />

        {/* App principal */}
        <RootStack.Screen name="Main"        component={MainTabs}          options={{ animation: 'fade' }} />

        {/* Acciones — modales sobre el Root, NO dentro de ningún tab */}
        <RootStack.Screen
          name="NuevoSello"
          component={NuevoSelloScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
        />
        <RootStack.Screen
          name="NuevaValidacion"
          component={NuevaValidacionScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
        />
      </RootStack.Navigator>
      </NfcGuardProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
