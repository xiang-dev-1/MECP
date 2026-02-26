import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { initDatabase } from '@/storage/database';

function ResetButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.dismissAll()}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#475569',
        backgroundColor: 'rgba(71,85,105,0.25)',
      }}
    >
      <Text style={{ color: '#cbd5e1', fontSize: 14, fontWeight: '600' }}>
        Reset
      </Text>
    </Pressable>
  );
}

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
          options={{
            title: 'Category',
            presentation: 'card',
            headerRight: () => <ResetButton />,
          }}
        />
        <Stack.Screen
          name="compose/codes"
          options={{
            title: 'Codes',
            presentation: 'card',
            headerRight: () => <ResetButton />,
          }}
        />
        <Stack.Screen
          name="compose/preview"
          options={{
            title: 'Preview & Send',
            presentation: 'card',
            headerRight: () => <ResetButton />,
          }}
        />
        <Stack.Screen
          name="message/[id]"
          options={{ title: 'Message' }}
        />
      </Stack>
    </>
  );
}
