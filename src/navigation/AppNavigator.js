/**
 * navigation/AppNavigator.js
 * ──────────────────────────────────────────────────────────
 * Configuración del stack de navegación con React Navigation.
 * Stack nativo para transiciones fluidas en iOS y Android.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import ScannerScreen from '../screens/ScannerScreen';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown:      false,          // Usamos headers propios
        contentStyle:     { backgroundColor: Colors.bg },
        animation:        'slide_from_right',
        gestureEnabled:   true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ title: 'Bienvenida' }}
      />
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: 'Lector RFID' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
