import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { initDatabase } from '@/storage/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';

function ResetButton() {
  const router = useRouter();
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
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
        {langFile?.ui?.reset ?? 'Reset'}
      </Text>
    </Pressable>
  );
}

export default function RootLayout() {
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const ui = langFile?.ui;

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
          options={{ title: ui?.severity_header ?? 'Severity', presentation: 'card' }}
        />
        <Stack.Screen
          name="compose/category"
          options={{
            title: ui?.category_header ?? 'Category',
            presentation: 'card',
            headerRight: () => <ResetButton />,
          }}
        />
        <Stack.Screen
          name="compose/codes"
          options={{
            title: ui?.codes_header ?? 'Codes',
            presentation: 'card',
            headerRight: () => <ResetButton />,
          }}
        />
        <Stack.Screen
          name="compose/preview"
          options={{
            title: ui?.preview_send ?? 'Preview & Send',
            presentation: 'card',
            headerRight: () => <ResetButton />,
          }}
        />
        <Stack.Screen
          name="message/[id]"
          options={{ title: ui?.mecp_message ?? 'Message' }}
        />
        <Stack.Screen
          name="beacon/status"
          options={{
            title: ui?.beacon_active ?? 'Beacon Active',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}
