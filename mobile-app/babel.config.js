module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@/ui': './src/ui',
            '@/screens': './src/screens',
            '@': './',
          },
        },
      ],
    ],
  };
};