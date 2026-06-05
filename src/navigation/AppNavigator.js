import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';

import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../theme';
import Icon from '../components/Icon';

import WelcomeScreen         from '../screens/WelcomeScreen';
import SetupWalletScreen     from '../screens/SetupWalletScreen';
import InicioScreen          from '../screens/InicioScreen';
import SellosScreen          from '../screens/SellosScreen';
import NuevoSelloScreen      from '../screens/NuevoSelloScreen';
import ValidacionesScreen    from '../screens/ValidacionesScreen';
import NuevaValidacionScreen from '../screens/NuevaValidacionScreen';
import WalletScreen          from '../screens/WalletScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const { width } = Dimensions.get('window');
const isTablet  = width >= 768;
const ICON_SZ   = isTablet ? 24 : 22;
const TAB_H     = isTablet ? 72 : 60;

// ── Tab icon — ancho fijo para no cortarse ────────────────
const TabIcon = ({ iconName, label, focused, theme }) => {
  const color = focused ? theme.accent : theme.textMuted;
  return (
    <View style={[tabSt.wrap, { width: width / 4 - 4 }]}>
      <Icon name={iconName} size={ICON_SZ} color={color} />
      <Text
        style={[tabSt.label, { color, fontSize: isTablet ? 11 : 10 }]}
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
  wrap:  { alignItems: 'center', justifyContent: 'center', paddingTop: 4, gap: 2 },
  label: { fontWeight: FontWeight.medium, letterSpacing: 0.2 },
  dot:   { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});

// ── Stacks ────────────────────────────────────────────────
const makeStackOpts = (theme) => ({
  headerShown:  false,
  animation:    'slide_from_right',
  contentStyle: { backgroundColor: theme.bg },
});

const InicioStack  = () => { const { theme } = useTheme(); return (
  <Stack.Navigator screenOptions={makeStackOpts(theme)}>
    <Stack.Screen name="Inicio"          component={InicioScreen} />
    <Stack.Screen name="NuevoSello"      component={NuevoSelloScreen} />
    <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
  </Stack.Navigator>
)};

const SellarStack  = () => { const { theme } = useTheme(); return (
  <Stack.Navigator screenOptions={makeStackOpts(theme)}>
    <Stack.Screen name="Sellos"     component={SellosScreen} />
    <Stack.Screen name="NuevoSello" component={NuevoSelloScreen} />
  </Stack.Navigator>
)};

const ValidarStack = () => { const { theme } = useTheme(); return (
  <Stack.Navigator screenOptions={makeStackOpts(theme)}>
    <Stack.Screen name="Validaciones"    component={ValidacionesScreen} />
    <Stack.Screen name="NuevaValidacion" component={NuevaValidacionScreen} />
  </Stack.Navigator>
)};

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
      {[
        { name: 'InicioTab',  comp: InicioStack,  icon: 'home',   label: 'Inicio'  },
        { name: 'SellarTab',  comp: SellarStack,  icon: 'seal',   label: 'Sellos'  },
        { name: 'ValidarTab', comp: ValidarStack, icon: 'shield', label: 'Validar' },
        { name: 'WalletTab',  comp: WalletScreen, icon: 'wallet', label: 'Wallet'  },
      ].map(({ name, comp, icon, label }) => (
        <Tab.Screen key={name} name={name} component={comp}
          options={{ tabBarIcon: ({ focused }) =>
            <TabIcon iconName={icon} label={label} focused={focused} theme={theme} />
          }}
        />
      ))}
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
        <Stack.Screen name="Main"        component={MainTabs}          options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
