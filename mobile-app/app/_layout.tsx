// Reanimated and gesture-handler must be imported first
import 'react-native-gesture-handler'
import 'react-native-reanimated'

// 必須polyfillを最優先で読み込み
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'

// JSON Unicode処理の強化（最優先）
import { patchGlobalJSON } from '@/lib/global-json-fix'
import '@/lib/debug-json'

import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Stack, router, useLocalSearchParams, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
// Stripe import - Web環境では条件付きで無効化
import { Platform } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { UiThemeProvider } from '@/ui/theme';
// 新UIでは緑の展開型メニューに統一
import GlobalFABMenu from '@/components/chat/FabActions'
import AsyncStorage from '@react-native-async-storage/async-storage'

// fetch polyfillの強制適用
if (typeof global.fetch === 'undefined') {
  global.fetch = require('whatwg-fetch').fetch
} // デバッグ機能を有効化
patchGlobalJSON()
let StripeProvider: any = ({ children }: { children: React.ReactNode }) => children;

if (Platform.OS !== 'web') {
  try {
    const stripe = require('@stripe/stripe-react-native');
    StripeProvider = stripe.StripeProvider;
  } catch (error) {
    console.warn('Stripe not available on this platform');
  }
}


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  // React Native Paperのテーマを設定
  const paperTheme = isDark ? {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#007AFF',
      secondary: '#5856D6',
    },
  } : {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#007AFF',
      secondary: '#5856D6',
    },
  };

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={paperTheme}>
        {children}
        <StatusBar style={isDark ? "light" : "dark"} />
      </PaperProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isReady, setIsReady] = useState(false);
  // Hooks must not be conditional: call here before any early return
  const pathname = usePathname();
  const searchParams = useLocalSearchParams<{ project?: string }>()
  const isAuthRoute = pathname?.startsWith('/(auth)');
  const { user } = useAuth();
  const [chatOnly, setChatOnly] = useState(false)
  const showFab = !!user && !isAuthRoute && !chatOnly;

  // Load Chat-only toggle
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('chat_only_mode')
        setChatOnly(v === '1')
      } catch { }
    })()
  }, [])

  // Redirect create/edit routes to main-chat with intent (loop-safe)
  useEffect(() => {
    if (!pathname) return
    if (pathname === '/main-chat') return
    const map: [RegExp, string][] = [
      [/^\/reports\/create/, 'create_report'],
      [/^\/invoice\/create/, 'create_invoice'],
      [/^\/estimate\/new/, 'optimize_estimate'],
      [/^\/receipt-scan/, 'upload_doc']
    ]
    for (const [re, intent] of map) {
      if (re.test(pathname)) {
        if (intent === 'create_invoice' && searchParams?.project) {
          router.replace({ pathname: '/main-chat', params: { intent, project: String(searchParams.project) } })
        } else {
          router.replace({ pathname: '/main-chat', params: { intent } })
        }
        break
      }
    }
  }, [pathname])

  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      try {
        // 最小表示時間500msとフォント読み込みを並行実行
        const minimumSplashTime = new Promise(resolve => setTimeout(resolve, 500));
        const fontInitialization = loaded ? Promise.resolve() : new Promise(resolve => {
          // フォント読み込み待機の代替処理
          const checkFonts = () => loaded ? resolve(true) : setTimeout(checkFonts, 50);
          checkFonts();
        });

        // 初期化処理（テーマ読み込み、認証状態確認など）
        const appInitialization = Promise.resolve(); // 追加の初期化があればここに

        // すべての初期化を並行実行
        const allInitialization = Promise.all([
          minimumSplashTime,
          fontInitialization,
          appInitialization
        ]);

        // 最大2秒でタイムアウト
        const timeout = new Promise(resolve => setTimeout(resolve, 2000));

        // どちらか早い方が完了したらスプラッシュを隠す
        await Promise.race([allInitialization, timeout]);

        if (mounted) {
          setIsReady(true);
        }
      } catch (error) {
        console.warn('App initialization error:', error);
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    initializeApp();

    return () => {
      mounted = false;
    };
  }, [loaded]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY || '';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={stripePublishableKey}>
        <AuthProvider>
          <ThemeProvider>
            <UiThemeProvider>
              <NavigationWrapper>
                <Stack initialRouteName="index">
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="main-chat" options={{
                    title: 'クラフディ',
                    headerShown: true,
                    headerBackVisible: false,
                    headerLeft: () => null,
                  }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="new-project" options={{ headerShown: false }} />
                  <Stack.Screen name="project-create" options={{
                    presentation: 'modal',
                    title: '現場を作成',
                    headerShown: true,
                  }} />
                  <Stack.Screen name="project-detail/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="estimate/new" options={{ headerShown: false }} />
                  <Stack.Screen name="daily-report/new" options={{ headerShown: false }} />
                  <Stack.Screen name="pdf-preview" options={{ title: 'PDFプレビュー' }} />
                  <Stack.Screen name="attendance/summary" options={{ headerShown: false }} />
                  <Stack.Screen name="invoice/new" options={{ headerShown: false }} />
                  <Stack.Screen name="safety-docs" options={{ headerShown: false }} />
                  <Stack.Screen name="receipt-scan" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                {/* 新しいグローバルFABメニュー（未ログイン/認証画面では非表示） */}
                {showFab && <GlobalFABMenu />}
              </NavigationWrapper>
            </UiThemeProvider>
          </ThemeProvider>
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
