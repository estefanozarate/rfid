import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

import { useTheme }   from '../context/ThemeContext';
import { Spacing, Radius, FontWeight } from '../theme';
import { RFontSize, rs } from '../utils/responsive';
import Icon from '../components/Icon';

import WelcomeScreen         from '../screens/WelcomeScreen';
import SetupWalletScreen     from '../screens/SetupWalletScreen';
import SetupPinScreen        from '../screens/SetupPinScreen';
import InicioScreen          from '../screens/InicioScreen';
import SellosScreen          from '../screens/SellosScreen';
import NuevoSelloScreen      from '../screens/NuevoSelloScreen';
import ValidacionesScreen    from '../screens/ValidacionesScreen';
import NuevaValidacionScreen from '../screens/NuevaValidacionScreen';
import WalletScreen          from '../screens/WalletScreen';
import PinLoginScreen        from '../screens/PinLoginScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const TAB_H     = isTablet ? 72 : 62;

// ── Tab icon ──────────────────────────────────────────────
const TabIcon = ({ iconName, label, focused, theme }) => {
  const color = focused ? theme.accent : theme.textMuted;
  return (
    <View style={[tabSt.wrap, { width: width / 4 - rs(4) }]}>
      <Icon name={iconName} size={RFontSize.xl} color={color} />
      <Text style={[tabSt.label, { color, fontSize: RFontSize.xs }]} numberOfLines={1} ellipsizeMode="clip">
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

const makeStackOpts = (theme) => ({
  headerShown:  false,
  animation:    'slide_from_right',
  contentStyle: { backgroundColor: theme.bg },
});

// ── Stacks ────────────────────────────────────────────────
const InicioStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={makeStackOpts(theme)}>
      <Stack.Screen name="Inicio"          component={InicioScreen} />
      <Stack.Screen name="NuevoSello"      component={NuevoSelloScreen} />
      <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
    </Stack.Navigator>
  );
};

const SellarStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={makeStackOpts(theme)}>
      <Stack.Screen name="Sellos"     component={SellosScreen} />
      <Stack.Screen name="NuevoSello" component={NuevoSelloScreen} />
    </Stack.Navigator>
  );
};

const ValidarStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={makeStackOpts(theme)}>
      <Stack.Screen name="Validaciones"    component={ValidacionesScreen} />
      <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
    </Stack.Navigator>
  );
};

// ── Bottom Tabs ───────────────────────────────────────────
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
      <Tab.Screen name="InicioTab"
        component={InicioStack}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="home" label="Inicio" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen name="SellarTab"
        component={SellarStack}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="seal" label="Sellos" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen name="ValidarTab"
        component={ValidarStack}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="shield" label="Validados" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen name="WalletTab"
        component={WalletScreen}
        options={{ tabBarIcon: ({ focused }) =>
          <TabIcon iconName="wallet" label="Wallet" focused={focused} theme={theme} /> }}
      />
    </Tab.Navigator>
  );
};

// ── Root ──────────────────────────────────────────────────
const AppNavigator = () => {
  const { theme } = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="Welcome"     component={WelcomeScreen} />
        <Stack.Screen name="SetupWallet" component={SetupWalletScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="SetupPin"    component={SetupPinScreen}    options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Main"        component={MainTabs}          options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
