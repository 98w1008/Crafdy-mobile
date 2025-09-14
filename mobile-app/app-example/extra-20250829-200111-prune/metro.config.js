const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Security Agent - Metro configuration for network handling
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper module resolution for polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-get-random-values': require.resolve('react-native-get-random-values'),
  'react-native-url-polyfill/auto': require.resolve('react-native-url-polyfill/auto'),
};

module.exports = config;