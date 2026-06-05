import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

import WelcomeScreen         from '../screens/WelcomeScreen';
import SetupWalletScreen     from '../screens/SetupWalletScreen';
import InicioScreen          from '../screens/InicioScreen';
import SellosScreen          from '../screens/SellosScreen';
import NuevoSelloScreen      from '../screens/NuevoSelloScreen';
import ValidacionesScreen    from '../screens/ValidacionesScreen';
import NuevaValidacionScreen from '../screens/NuevaValidacionScreen';
import WalletScreen          from '../screens/WalletScreen';

import { Colors, FontWeight } from '../theme';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const stackOpts = {
  headerShown:  false,
  animation:    'slide_from_right',
  contentStyle: { backgroundColor: Colors.bg },
};

// ── Tamaño responsive ─────────────────────────────────────
const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const TAB_H     = isTablet ? 72 : 62;
const ICON_SIZE = isTablet ? 28 : 22;
const LABEL_SZ  = isTablet ? 11 : 9;
const DOT_SIZE  = isTablet ? 5  : 4;

// ── Iconos View puro ──────────────────────────────────────
const IconHome = ({ color, s }) => (
  <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
    <View style={{ width: 0, height: 0,
      borderLeftWidth: s * 0.5, borderRightWidth: s * 0.5, borderBottomWidth: s * 0.4,
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
    <View style={{ width: s * 0.72, height: s * 0.5, borderWidth: 1.8, borderColor: color, borderTopWidth: 0 }}>
      <View style={{ width: s * 0.23, height: s * 0.32, borderWidth: 1.5, borderColor: color,
        position: 'absolute', bottom: 0, alignSelf: 'center' }} />
    </View>
  </View>
);

const IconSeal = ({ color, s }) => (
  <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: s * 0.82, height: s * 0.82, borderRadius: s * 0.41,
      borderWidth: 1.8, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s * 0.36, height: s * 0.36, borderRadius: s * 0.18,
        borderWidth: 1.5, borderColor: color }} />
    </View>
    <View style={{ position: 'absolute', width: s * 0.23, height: s * 0.12,
      borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: color,
      transform: [{ rotate: '-45deg' }] }} />
  </View>
);

const IconShield = ({ color, s }) => (
  <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: s * 0.73, height: s * 0.59, borderWidth: 1.8, borderColor: color,
      borderRadius: 3, borderBottomWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s * 0.27, height: s * 0.14,
        borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: color,
        transform: [{ rotate: '-45deg' }], marginTop: s * 0.09 }} />
    </View>
    <View style={{ width: 0, height: 0,
      borderLeftWidth: s * 0.36, borderRightWidth: s * 0.36, borderTopWidth: s * 0.27,
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
  </View>
);

const IconWallet = ({ color, s }) => (
  <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: s * 0.91, height: s * 0.59, borderWidth: 1.8, borderColor: color,
      borderRadius: 3, alignItems: 'flex-end', justifyContent: 'center', paddingRight: s * 0.09 }}>
      <View style={{ position: 'absolute', top: -s * 0.23, left: s * 0.09,
        width: s * 0.45, height: s * 0.23,
        borderTopWidth: 1.8, borderLeftWidth: 1.8, borderRightWidth: 1.8,
        borderColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      <View style={{ width: s * 0.36, height: s * 0.36, borderRadius: s * 0.18,
        borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: s * 0.14, height: s * 0.14, borderRadius: s * 0.07, backgroundColor: color }} />
      </View>
    </View>
  </View>
);

const ICONS = { home: IconHome, seal: IconSeal, shield: IconShield, wallet: IconWallet };

const TabIcon = ({ iconKey, label, focused }) => {
  const Icon  = ICONS[iconKey];
  const color = focused ? Colors.accent : Colors.textMuted;
  return (
    <View style={[tabSt.wrap, { paddingTop: isTablet ? 6 : 4 }]}>
      <Icon color={color} s={ICON_SIZE} />
      <Text style={[tabSt.label, { fontSize: LABEL_SZ }, focused && tabSt.labelOn]}>{label}</Text>
      {focused && <View style={[tabSt.dot, { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 }]} />}
    </View>
  );
};

const tabSt = StyleSheet.create({
  wrap:    { alignItems: 'center', gap: 2 },
  label:   { color: Colors.textMuted, letterSpacing: 0.3 },
  labelOn: { color: Colors.accent, fontWeight: FontWeight.bold },
  dot:     { backgroundColor: Colors.accent, marginTop: 1 },
});

// ── Stacks ────────────────────────────────────────────────
const InicioStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Inicio"          component={InicioScreen} />
    <Stack.Screen name="NuevoSello"      component={NuevoSelloScreen} />
    <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
  </Stack.Navigator>
);

const SellarStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Sellos"     component={SellosScreen} />
    <Stack.Screen name="NuevoSello" component={NuevoSelloScreen} />
  </Stack.Navigator>
);

const ValidarStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Validaciones"    component={ValidacionesScreen} />
    <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
  </Stack.Navigator>
);

// ── Bottom Tabs ───────────────────────────────────────────
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown:     false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: Colors.bgSurface,
        borderTopColor:  Colors.bgBorder,
        borderTopWidth:  1,
        height:          TAB_H,
        paddingBottom:   isTablet ? 10 : 6,
        paddingTop:      isTablet ? 6  : 2,
      },
    }}
  >
    <Tab.Screen name="InicioTab"  component={InicioStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon iconKey="home"   label="Inicio"  focused={focused} /> }} />
    <Tab.Screen name="SellarTab"  component={SellarStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon iconKey="seal"   label="Sellos"  focused={focused} /> }} />
    <Tab.Screen name="ValidarTab" component={ValidarStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon iconKey="shield" label="Validar" focused={focused} /> }} />
    <Tab.Screen name="WalletTab"  component={WalletScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon iconKey="wallet" label="Wallet"  focused={focused} /> }} />
  </Tab.Navigator>
);

// ── Root ──────────────────────────────────────────────────
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="Welcome"     component={WelcomeScreen} />
      <Stack.Screen name="SetupWallet" component={SetupWalletScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Main"        component={MainTabs}          options={{ animation: 'fade' }} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
