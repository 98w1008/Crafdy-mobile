import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';

// Supabase import
import { supabase } from './src/lib/supabase';

// Screen imports
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Navigation types
export type AuthStackParamList = {
  Auth: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Projects: undefined;
  Settings: undefined;
};

// Create navigators
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Loading component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>C</Text>
      </View>
      <Text style={styles.loadingText}>読み込み中...</Text>
    </View>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'ホーム',
          tabBarLabel: 'ホーム',
        }}
      />
      <MainTab.Screen
        name="Projects"
        component={ProfileScreen} // 一時的にProfileScreenを使用
        options={{
          title: 'プロジェクト',
          tabBarLabel: 'プロジェクト',
        }}
      />
      <MainTab.Screen
        name="Settings"
        component={ProfileScreen} // 一時的にProfileScreenを使用
        options={{
          title: '設定',
          tabBarLabel: '設定',
        }}
      />
    </MainTab.Navigator>
  );
}

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Auth" component={AuthScreen} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 App.tsx - Initializing auth state...');

    // 初期セッションを取得
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
        } else {
          console.log('✅ Initial session:', initialSession?.user?.email || 'No session');
          setSession(initialSession);
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed in App.tsx:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setLoading(false);
        
        // セッション情報をコンソールに表示
        if (session) {
          console.log('✅ User logged in:', session.user.email);
        } else {
          console.log('📤 User logged out');
        }
      }
    );

    // クリーンアップ
    return () => {
      console.log('🧹 Cleaning up auth listener...');
      subscription.unsubscribe();
    };
  }, []);

  // ローディング中の表示
  if (loading) {
    return (
      <>
        <StatusBar style="auto" />
        <LoadingScreen />
      </>
    );
  }

  // 認証状態に基づく画面表示
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {session ? (
        <>
          {console.log('🎯 Rendering MainTabNavigator for user:', session.user.email)}
          <MainTabNavigator />
        </>
      ) : (
        <>
          {console.log('🔑 Rendering AuthNavigator - no session')}
          <AuthNavigator />
        </>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
  },
});