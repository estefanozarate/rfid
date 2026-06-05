import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

import WelcomeScreen         from '../screens/WelcomeScreen';
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
  headerShown:   false,
  animation:     'slide_from_right',
  contentStyle:  { backgroundColor: Colors.bg },
};

// ── Iconos puros con View/Text — sin librerías nativas ────

// Casa: techo triangular + cuerpo + puerta
const IconHome = ({ color }) => (
  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'flex-end' }}>
    {/* techo */}
    <View style={{ width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, marginBottom: 0 }} />
    {/* cuerpo */}
    <View style={{ width: 16, height: 11, borderWidth: 1.8, borderColor: color, borderTopWidth: 0 }}>
      {/* puerta */}
      <View style={{ width: 5, height: 7, borderWidth: 1.5, borderColor: color, position: 'absolute', bottom: 0, alignSelf: 'center' }} />
    </View>
  </View>
);

// Sello: estrella simplificada con círculo exterior
const IconSeal = ({ color }) => (
  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.8, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: color }} />
    </View>
    {/* tick interno */}
    <View style={{ position: 'absolute', width: 5, height: 2.5, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: color, transform: [{ rotate: '-45deg' }], marginTop: 1 }} />
  </View>
);

// Shield: rectángulo con punta abajo + tick
const IconShield = ({ color }) => (
  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 16, height: 13, borderWidth: 1.8, borderColor: color, borderRadius: 3, borderBottomWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
      {/* tick */}
      <View style={{ width: 6, height: 3, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: color, transform: [{ rotate: '-45deg' }], marginTop: 2 }} />
    </View>
    {/* punta del escudo */}
    <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
  </View>
);

// Wallet: rectángulo con bolsillo circular
const IconWallet = ({ color }) => (
  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 20, height: 13, borderWidth: 1.8, borderColor: color, borderRadius: 3, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 3 }}>
      {/* tapa superior */}
      <View style={{ position: 'absolute', top: -5, left: 2, width: 10, height: 5, borderTopWidth: 1.8, borderLeftWidth: 1.8, borderRightWidth: 1.8, borderColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      {/* bolsillo */}
      <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      </View>
    </View>
  </View>
);

const ICON_MAP = { home: IconHome, seal: IconSeal, shield: IconShield, wallet: IconWallet };

const TabIcon = ({ iconKey, label, focused }) => {
  const Icon = ICON_MAP[iconKey];
  const color = focused ? Colors.accent : Colors.textMuted;
  return (
    <View style={tabSt.wrap}>
      <Icon color={color} />
      <Text style={[tabSt.label, focused && tabSt.labelOn]}>{label}</Text>
      {focused && <View style={tabSt.dot} />}
    </View>
  );
};

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
        <TabIcon iconKey="home" label="Inicio" focused={focused} /> }}
    />
    <Tab.Screen name="SellarTab"
      component={SellarStack}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconKey="seal" label="Sellos" focused={focused} /> }}
    />
    <Tab.Screen name="ValidarTab"
      component={ValidarStack}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconKey="shield" label="Validar" focused={focused} /> }}
    />
    <Tab.Screen name="WalletTab"
      component={WalletScreen}
      options={{ tabBarIcon: ({ focused }) =>
        <TabIcon iconKey="wallet" label="Wallet" focused={focused} /> }}
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
