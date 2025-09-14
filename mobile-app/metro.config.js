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

// Web-specific configuration to exclude Stripe
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Block Stripe modules on web platform
config.resolver.blockList = [
  /node_modules\/@stripe\/stripe-react-native\/.*\.js$/,
];

// Platform-specific module resolution
config.resolver.platformMap = {
  web: {
    '@stripe/stripe-react-native': false,
  }
};

module.exports = config;