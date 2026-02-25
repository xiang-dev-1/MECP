import { View, Text, StyleSheet } from 'react-native';
import type { TransportStatus } from '../transport/types';

const STATUS_CONFIG: Record<
  TransportStatus,
  { color: string; bg: string; label: string }
> = {
  connected: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    label: 'Connected to Meshtastic',
  },
  connecting: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    label: 'Connecting...',
  },
  disconnected: {
    color: '#64748b',
    bg: 'rgba(100,116,139,0.1)',
    label: 'Not connected',
  },
  error: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    label: 'Connection error',
  },
};

interface Props {
  status: TransportStatus;
}

export function DeviceStatus({ status }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.color }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
