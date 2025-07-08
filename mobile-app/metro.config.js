const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Node.js 17対応のための最小限設定
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: false,
};

// Metro watcher完全無効化でAbortSignalエラーを回避
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // AbortSignal問題を回避
      if (req.signal && !req.signal.throwIfAborted) {
        req.signal.throwIfAborted = function() {
          if (this.aborted) {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            throw error;
          }
        };
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;