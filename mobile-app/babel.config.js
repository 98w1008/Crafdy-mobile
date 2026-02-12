module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: { '@': ['./src', '.'] },
          extensions: ['.tsx', '.ts', '.js', '.json'],
        },
      ],
      // Reanimated v3 uses worklets plugin; must be last
      'react-native-worklets/plugin',
    ],
  };
};
