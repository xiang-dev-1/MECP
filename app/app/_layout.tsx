import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase } from '@/storage/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f1f5f9',
          contentStyle: { backgroundColor: '#0f172a' },
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="compose/severity"
          options={{ title: 'Severity', presentation: 'card' }}
        />
        <Stack.Screen
          name="compose/category"
          options={{ title: 'Category', presentation: 'card' }}
        />
        <Stack.Screen
          name="compose/codes"
          options={{ title: 'Codes', presentation: 'card' }}
        />
        <Stack.Screen
          name="compose/preview"
          options={{ title: 'Preview & Send', presentation: 'card' }}
        />
        <Stack.Screen
          name="message/[id]"
          options={{ title: 'Message' }}
        />
      </Stack>
    </>
  );
}
