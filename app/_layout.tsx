import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import '../styles/scrollbar.css';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = '#0F1419';
      document.documentElement.style.backgroundColor = '#0F1419';
      window.frameworkReady?.();
    }
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subject/new" />
        <Stack.Screen name="subject/[id]" />
        <Stack.Screen name="term/new" />
        <Stack.Screen name="term/[id]" />
        <Stack.Screen name="term/edit" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
