import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTransportStore } from '@/store/useTransportStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import type { TransportStatus } from '@/transport/types';

const DOT_COLORS: Record<TransportStatus, string> = {
  connected: '#22c55e',
  connecting: '#f59e0b',
  disconnected: '#ef4444',
  error: '#ef4444',
};

function ConnectionDot() {
  const status = useTransportStore((s) => s.status);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      opacity.setValue(1);
    }
  }, [status]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: DOT_COLORS[status],
        marginRight: 16,
        opacity,
      }}
    />
  );
}

export default function TabLayout() {
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const ui = langFile?.ui;

  const composeLabel = ui?.compose ?? 'Compose';
  const inboxLabel = ui?.inbox ?? 'Inbox';
  const inboxTab = ui?.inbox_tab ?? 'Inbox';
  const referenceLabel = ui?.reference_card ?? 'Reference';
  const referenceTab = ui?.reference_tab ?? 'Reference';
  const settingsLabel = ui?.settings ?? 'Settings';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: 52,
          maxWidth: 600,
          alignSelf: 'center',
          width: '100%',
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="compose"
        options={{
          title: composeLabel,
          headerRight: () => <ConnectionDot />,
          tabBarIcon: ({ focused }) => <TabItem icon={'\u270F\uFE0F'} label={composeLabel} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: inboxLabel,
          tabBarIcon: ({ focused }) => <TabItem icon={'\uD83D\uDCEC'} label={inboxTab} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reference"
        options={{
          title: referenceLabel,
          tabBarIcon: ({ focused }) => <TabItem icon={'\uD83D\uDCCB'} label={referenceTab} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: settingsLabel,
          tabBarIcon: ({ focused }) => <TabItem icon={'\u2699\uFE0F'} label={settingsLabel} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabItem({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  const color = focused ? '#3b82f6' : '#64748b';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 16, lineHeight: 16 }}>{icon}</Text>
      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}
