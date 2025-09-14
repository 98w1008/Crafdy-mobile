import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function NotFoundScreen() {
  const { user, loading } = useAuth();

  // 3秒後に自動的にホームに戻る
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          router.replace('/(tabs)/');
        } else {
          router.replace('/(auth)/login');
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, loading]);

  const handleGoHome = () => {
    if (user) {
      router.replace('/(tabs)/');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'ページが見つかりません' }} />
      <View style={styles.container}>
        <Text style={styles.title}>🔍 このページは存在しません</Text>
        <Text style={styles.subtitle}>3秒後に自動的にホームに戻ります</Text>
        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>今すぐホームに戻る</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});