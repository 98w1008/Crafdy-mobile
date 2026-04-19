import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack initialRouteName="auth-screen">
      <Stack.Screen
        name="auth-screen"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="signup"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="signup-with-code"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}