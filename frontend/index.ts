// Disable expo-router compatibility check for SDK 56
// @ts-ignore
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
