import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useBeaconStore } from '@/store/useBeaconStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import { DrillBanner } from '@/components/DrillBanner';
import { encode, type Severity } from '@mecp/engine';
import { useTransportStore } from '@/store/useTransportStore';

export default function BeaconStatusScreen() {
  const router = useRouter();
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const ui = langFile?.ui;
  const transport = useTransportStore((s) => s.transport);

  const activeSession = useBeaconStore((s) => s.activeSession);
  const positions = useBeaconStore((s) => s.positions);
  const ackState = useBeaconStore((s) => s.ackState);
  const ackDisplayName = useBeaconStore((s) => s.ackDisplayName);
  const cancelBeacon = useBeaconStore((s) => s.cancelBeacon);

  const [countdown, setCountdown] = useState('');

  // Update countdown every second
  useEffect(() => {
    if (!activeSession) return;
    const tick = () => {
      const lastTx = positions.length > 0 ? positions[0].timestamp : activeSession.started_at;
      const nextTx = lastTx + activeSession.interval_minutes * 60 * 1000;
      const remaining = Math.max(0, nextTx - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession, positions]);

  // Calculate active duration
  const duration = activeSession
    ? formatDuration(Date.now() - activeSession.started_at)
    : '';

  const handleCancel = useCallback(() => {
    Alert.alert(
      ui?.beacon_cancel ?? 'Cancel Beacon',
      '',
      [
        { text: ui?.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          style: 'destructive',
          onPress: async () => {
            // Send B03
            if (activeSession) {
              const codes = JSON.parse(activeSession.original_codes) as string[];
              const msg = encode(2 as Severity, ['B03'], undefined);
              try {
                await transport?.send(msg.message, null);
              } catch { /* queued */ }
            }
            await cancelBeacon();
            if (Platform.OS !== 'web') {
              const { stopBeacon } = await import('@/services/beaconService');
              await stopBeacon();
            }
            router.dismissAll();
          },
        },
      ]
    );
  }, [activeSession, transport, cancelBeacon, router, ui]);

  if (!activeSession) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSession}>No active beacon</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeSession.is_drill && <DrillBanner />}

      {/* Pulsing header */}
      <View style={styles.header}>
        <View style={styles.pulsingDot} />
        <Text style={styles.headerText}>
          {ui?.beacon_active ?? 'Distress beacon active'}
        </Text>
      </View>

      {/* ACK panel */}
      <View style={styles.ackPanel}>
        {ackState === 'waiting' && (
          <Text style={styles.ackWaiting}>
            {ui?.ack_waiting ?? 'Waiting for acknowledgement...'}
          </Text>
        )}
        {ackState === 'expired' && (
          <Text style={styles.ackExpired}>
            {ui?.ack_no_response ?? 'No response received'}
          </Text>
        )}
        {ackState === 'acknowledged' && (
          <Text style={styles.ackReceived}>
            {ui?.beacon_ack_received ?? 'Beacon acknowledged by'} {ackDisplayName ?? 'unknown'}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>
            {ui?.beacon_countdown ?? 'Next transmission in'}
          </Text>
          <Text style={styles.statValue}>{countdown}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Transmissions</Text>
          <Text style={styles.statValue}>{activeSession.transmit_count}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Interval</Text>
          <Text style={styles.statValue}>{activeSession.interval_minutes} min</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{ui?.beacon_duration ?? 'Active for'}</Text>
          <Text style={styles.statValue}>{duration}</Text>
        </View>
      </View>

      {/* Position history */}
      <Text style={styles.sectionTitle}>
        {ui?.beacon_positions ?? 'Position History'}
      </Text>
      <FlatList
        data={positions}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View style={styles.posRow}>
            <Text style={styles.posCoords}>
              {item.gps_lat.toFixed(5)}, {item.gps_lon.toFixed(5)}
            </Text>
            <Text style={styles.posTime}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyPos}>No positions recorded yet</Text>
        }
        style={styles.posList}
      />

      {/* Cancel button */}
      <View style={styles.footer}>
        <Pressable style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>
            {ui?.beacon_cancel ?? 'Cancel Beacon'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  noSession: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  pulsingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  headerText: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: '800',
  },
  ackPanel: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  ackWaiting: {
    color: '#f59e0b',
    fontSize: 14,
  },
  ackExpired: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  ackReceived: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
  },
  stats: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  statValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  posList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  posRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  posCoords: {
    color: '#f1f5f9',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  posTime: {
    color: '#64748b',
    fontSize: 13,
  },
  emptyPos: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
});
