import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, User } from 'firebase/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/firebaseConfig'; // 👈 make sure this imports your Firebase setup


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          // If logged in, go to tabs (home)
          <Stack.Screen name="(tabs)" />
        ) : (
          // If not logged in, show auth screens
          <Stack.Screen name="auth" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
