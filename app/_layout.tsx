import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.textContent = `
          ::-webkit-scrollbar {
            width: 14px;
            height: 14px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(59, 130, 246, 0.1);
            border-radius: 12px;
            margin: 4px;
          }

          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 12px;
            border: 3px solid transparent;
            background-clip: padding-box;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
          }

          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
            border-radius: 12px;
            border: 2px solid transparent;
            background-clip: padding-box;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
          }

          ::-webkit-scrollbar-thumb:active {
            background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
          }

          * {
            scrollbar-width: thin;
            scrollbar-color: #3b82f6 rgba(59, 130, 246, 0.1);
          }
        `;
        document.head.appendChild(style);
      }
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
      <StatusBar style="auto" />
    </>
  );
}
