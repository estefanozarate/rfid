// MUST be first import — polyfill crypto.getRandomValues para @noble libs en RN
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
