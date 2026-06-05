/**
 * navigation/AppNavigator.js
 * Welcome → Main (Bottom Tabs)
 * Cada tab tiene su propio Stack para navegación interna.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer }      from '@react-navigation/native';
import { createNativeStackNavigator }  from '@react-navigation/native-stack';
import { createBottomTabNavigator }    from '@react-navigation/bottom-tabs';

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

// ── Tab icon ──────────────────────────────────────────────
const TabIcon = ({ emoji, label, focused }) => (
  <View style={[tabStyles.icon, focused && tabStyles.iconActive]}>
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
    <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    {focused && <View style={tabStyles.dot} />}
  </View>
);

const tabStyles = StyleSheet.create({
  icon:        { alignItems: 'center', gap: 2, paddingTop: 6 },
  iconActive:  {},
  label:       { fontSize: 9, color: Colors.textMuted, letterSpacing: 0.3 },
  labelActive: { color: Colors.accent, fontWeight: FontWeight.bold },
  dot:         { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent, marginTop: 1 },
});

// ── Stacks por tab ────────────────────────────────────────
const InicioStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: Colors.bg } }}>
    <Stack.Screen name="Inicio"      component={InicioScreen} />
    <Stack.Screen name="NuevoSello"  component={NuevoSelloScreen} />
    <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
  </Stack.Navigator>
);

const SellarStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: Colors.bg } }}>
    <Stack.Screen name="Sellos"     component={SellosScreen} />
    <Stack.Screen name="NuevoSello" component={NuevoSelloScreen} />
  </Stack.Navigator>
);

const ValidarStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: Colors.bg } }}>
    <Stack.Screen name="Validaciones"    component={ValidacionesScreen} />
    <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
  </Stack.Navigator>
);

// ── Bottom Tabs ───────────────────────────────────────────
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor:  Colors.bgSurface,
        borderTopColor:   Colors.bgBorder,
        borderTopWidth:   1,
        height:           64,
        paddingBottom:    8,
      },
    }}
  >
    <Tab.Screen
      name="InicioTab"
      component={InicioStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Inicio" focused={focused} /> }}
    />
    <Tab.Screen
      name="SellarTab"
      component={SellarStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔏" label="Sellos" focused={focused} /> }}
    />
    <Tab.Screen
      name="ValidarTab"
      component={ValidarStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🛡️" label="Validar" focused={focused} /> }}
    />
    <Tab.Screen
      name="WalletTab"
      component={WalletScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👛" label="Wallet" focused={focused} /> }}
    />
  </Tab.Navigator>
);

// ── Root navigator ────────────────────────────────────────
const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Main"    component={MainTabs} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
