import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer }         from '@react-navigation/native';
import { createNativeStackNavigator }  from '@react-navigation/native-stack';
import { createBottomTabNavigator }    from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

import WelcomeScreen         from '../screens/WelcomeScreen';
import InicioScreen          from '../screens/InicioScreen';
import SellosScreen          from '../screens/SellosScreen';
import NuevoSelloScreen      from '../screens/NuevoSelloScreen';
import ValidacionesScreen    from '../screens/ValidacionesScreen';
import NuevaValidacionScreen from '../screens/NuevaValidacionScreen';
import WalletScreen          from '../screens/WalletScreen';

import { Colors, FontSize, FontWeight } from '../theme';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const stackOpts = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: Colors.bg },
};

// ── Iconos SVG limpios ────────────────────────────────────

const IconHome = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <Path d="M9 21V12h6v9" />
  </Svg>
);

const IconSeal = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2l2.4 4.8 5.6.8-4 3.9.9 5.5L12 14.5l-4.9 2.5.9-5.5-4-3.9 5.6-.8z" />
    <Line x1="12" y1="17" x2="12" y2="22" />
    <Line x1="8"  y1="22" x2="16" y2="22" />
  </Svg>
);

const IconShield = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2l7 3v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V5l7-3z" />
    <Polyline points="9,12 11,14 15,10" />
  </Svg>
);

const IconWallet = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="5" width="20" height="14" rx="2" />
    <Path d="M16 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill={color} stroke="none" />
    <Path d="M2 9h20" />
  </Svg>
);

// ── Tab label + dot ───────────────────────────────────────
const TabIcon = ({ Icon, label, focused }) => (
  <View style={tabSt.wrap}>
    <Icon color={focused ? Colors.accent : Colors.textMuted} size={22} />
    <Text style={[tabSt.label, focused && tabSt.labelOn]}>{label}</Text>
    {focused && <View style={tabSt.dot} />}
  </View>
);

const tabSt = StyleSheet.create({
  wrap:    { alignItems: 'center', gap: 2, paddingTop: 4 },
  label:   { fontSize: 9, color: Colors.textMuted, letterSpacing: 0.3 },
  labelOn: { color: Colors.accent, fontWeight: FontWeight.bold },
  dot:     { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent, marginTop: 1 },
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
        height:          62,
        paddingBottom:   6,
      },
    }}
  >
    <Tab.Screen name="InicioTab"
      component={InicioStack}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon Icon={IconHome} label="Inicio" focused={focused} /> }}
    />
    <Tab.Screen name="SellarTab"
      component={SellarStack}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon Icon={IconSeal} label="Sellos" focused={focused} /> }}
    />
    <Tab.Screen name="ValidarTab"
      component={ValidarStack}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon Icon={IconShield} label="Validar" focused={focused} /> }}
    />
    <Tab.Screen name="WalletTab"
      component={WalletScreen}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon Icon={IconWallet} label="Wallet" focused={focused} /> }}
    />
  </Tab.Navigator>
);

// ── Root ──────────────────────────────────────────────────
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Main"    component={MainTabs} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
