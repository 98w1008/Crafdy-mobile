// Expo公式ベストプラクティスに従った環境変数設定
require('dotenv').config();

// 環境変数の検証と安全な取得
function getRequiredEnvVar(name, fallback = null) {
  const value = process.env[name];
  if (!value || value === 'undefined') {
    if (fallback) {
      console.warn(`⚠️ Environment variable ${name} not found, using fallback`);
      return fallback;
    }
    console.error(`❌ Required environment variable ${name} is not set`);
    console.error(`   Please check your .env file and ensure ${name} is properly configured`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// 環境変数の取得とログ出力
console.log('🔧 Loading environment variables for Expo config...');

const supabaseUrl = getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'https://aerscsgzulqfsecltyjz.supabase.co');
const supabaseAnonKey = getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnNjc2d6dWxxZnNlY2x0eWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDk1NjQsImV4cCI6MjA2NjA4NTU2NH0.uNl3O7WzSQm-ud2OIjs7SV6jrqVdDSmeG6cvFoKA94I');
const stripePublicKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY || '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// 環境変数の検証ログ
console.log('✅ Environment variables loaded:');
console.log(`   SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey.length} characters`);
console.log(`   STRIPE_PUBLIC_KEY: ${stripePublicKey ? 'SET' : 'NOT SET'}`);
console.log(`   GOOGLE_IOS_CLIENT_ID: ${googleIosClientId ? 'SET' : 'NOT SET'}`);

export default {
  expo: {
    name: 'Crafdy Mobile',
    slug: 'crafdy-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'crafdy-mobile',
    packagerOpts: {
      config: 'metro.config.js'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.crafdy.mobile',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // ネットワークセキュリティ設定
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            'supabase.co': {
              NSExceptionAllowsInsecureHTTPLoads: false,
              NSExceptionMinimumTLSVersion: '1.2',
              NSIncludesSubdomains: true
            },
            'aerscsgzulqfsecltyjz.supabase.co': {
              NSExceptionAllowsInsecureHTTPLoads: false,
              NSExceptionMinimumTLSVersion: '1.2'
            }
          }
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      edgeToEdgeEnabled: true,
      package: 'com.crafdy.mobile'
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          dark: {
            image: './assets/images/splash-icon.png',
            backgroundColor: '#0A0A0A'
          },
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F5F5F5'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    // Expo公式ベストプラクティス: extraフィールドに環境変数を明示的に設定
    extra: {
      router: {},
      // Supabase設定（Constants.expoConfig.extraでアクセス可能）
      supabaseUrl,
      supabaseAnonKey,
      // その他の設定
      stripePublicKey,
      googleIosClientId,
      // 環境情報
      environment: process.env.NODE_ENV || 'development',
      // デバッグ情報
      configLoadedAt: new Date().toISOString(),
      // EAS設定
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || "your-project-id-here"
      }
    }
  }
};