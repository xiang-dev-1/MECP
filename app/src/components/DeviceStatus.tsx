import { View, Text, StyleSheet } from 'react-native';
import type { TransportStatus } from '../transport/types';
import type { LanguageFile } from '@mecp/engine';

const STATUS_COLORS: Record<
  TransportStatus,
  { color: string; bg: string }
> = {
  connected: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  connecting: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  disconnected: { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const FALLBACK_LABELS: Record<TransportStatus, string> = {
  connected: 'Connected to Meshtastic',
  connecting: 'Connecting...',
  disconnected: 'Not connected',
  error: 'Connection error',
};

function getStatusLabel(status: TransportStatus, langFile?: LanguageFile | null): string {
  if (!langFile?.ui) return FALLBACK_LABELS[status];
  switch (status) {
    case 'connected':
      return `${langFile.ui.connected_to ?? 'Connected to'} Meshtastic`;
    case 'connecting':
      return langFile.ui.connecting ?? 'Connecting...';
    case 'disconnected':
      return langFile.ui.not_connected ?? 'Not connected';
    case 'error':
      return FALLBACK_LABELS.error;
  }
}

interface Props {
  status: TransportStatus;
  langFile?: LanguageFile | null;
}

export function DeviceStatus({ status, langFile }: Props) {
  const colors = STATUS_COLORS[status];
  const label = getStatusLabel(status, langFile);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.color }]}>
      <View style={[styles.dot, { backgroundColor: colors.color }]} />
      <Text style={[styles.label, { color: colors.color }]}>
        {label}
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
