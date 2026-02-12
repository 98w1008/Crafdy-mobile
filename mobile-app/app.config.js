import 'dotenv/config'

// Bridge legacy .env keys to EXPO_PUBLIC_* so runtime code can read process.env
if (!process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL
}
if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
}
if (!process.env.EXPO_PUBLIC_AI_MOCK && process.env.AI_MOCK) {
  process.env.EXPO_PUBLIC_AI_MOCK = process.env.AI_MOCK
}

export default {
  expo: {
    name: "CrafdyMobile",
    slug: "crafdy-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "clafdi",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    // Expo extra: .env から読み込んだ Supabase 設定を注入
    extra: {
      supabaseUrl: process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      environment: process.env.NODE_ENV || 'development',
      configLoadedAt: new Date().toISOString(),
      aiMock: process.env.AI_MOCK || process.env.EXPO_PUBLIC_AI_MOCK || '1',
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.clafdy.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.crafdy.mobile"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon.png"
    },
    experiments: {
      typedRoutes: true
    },
    plugins: [
      "expo-router",
      "expo-dev-client"
    ]
  }
};
