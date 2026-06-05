import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen   from '../screens/WelcomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ScannerScreen   from '../screens/ScannerScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import NfcWriteScreen  from '../screens/NfcWriteScreen';
import FirmarScreen    from '../screens/FirmarScreen';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown:              false,
        contentStyle:             { backgroundColor: Colors.bg },
        animation:                'slide_from_right',
        gestureEnabled:           true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="Welcome"    component={WelcomeScreen}   />
      <Stack.Screen name="Dashboard"  component={DashboardScreen} />
      <Stack.Screen name="Scanner"    component={ScannerScreen}   />
      <Stack.Screen name="QRScanner"  component={QRScannerScreen} />
      <Stack.Screen name="NfcWrite"   component={NfcWriteScreen}  />
      <Stack.Screen name="Firmar"     component={FirmarScreen}    />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;