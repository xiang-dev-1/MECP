import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

export default function TabLayout() {
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
          title: 'Compose',
          tabBarIcon: ({ focused }) => <TabItem icon={'\u270F\uFE0F'} label="Compose" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused }) => <TabItem icon={'\uD83D\uDCEC'} label="Inbox" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reference"
        options={{
          title: 'Reference',
          tabBarIcon: ({ focused }) => <TabItem icon={'\uD83D\uDCCB'} label="Reference" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabItem icon={'\u2699\uFE0F'} label="Settings" focused={focused} />,
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
      <Text style={{ fontSize: 12, fontWeight: '600', color, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}
