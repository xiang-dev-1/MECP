import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useBeaconStore } from '../store/useBeaconStore';
import { useTransportStore } from '../store/useTransportStore';
import { DrillBanner } from './DrillBanner';
import { encode, type Severity } from '@mecp/engine';
import type { ReceivedBeacon, ReceivedBeaconPosition } from '../storage/database';
import type { LanguageFile } from '@mecp/engine';

interface BeaconCardProps {
  beacon: ReceivedBeacon;
  langFile: LanguageFile | null;
}

export function BeaconCard({ beacon, langFile }: BeaconCardProps) {
  const ui = langFile?.ui;
  const transport = useTransportStore((s) => s.transport);
  const loadReceivedPositions = useBeaconStore((s) => s.loadReceivedPositions);
  const receivedPositions = useBeaconStore((s) => s.receivedPositions);
  const [expanded, setExpanded] = useState(false);

  const positions = receivedPositions[beacon.id] ?? [];

  useEffect(() => {
    if (expanded && positions.length === 0) {
      loadReceivedPositions(beacon.id);
    }
  }, [expanded, beacon.id]);

  const activeDuration = formatDuration(Date.now() - beacon.first_seen);
  const lastSeenAgo = formatDuration(Date.now() - beacon.last_seen);
  const displayName = beacon.sender_display_name ?? beacon.sender_node_id;

  const handleAcknowledge = async () => {
    const msg = encode(2 as Severity, ['B02', 'R01'], undefined);
    try {
      await transport?.send(msg.message, null);
    } catch { /* will be queued */ }
  };

  return (
    <Pressable style={styles.card} onPress={() => setExpanded(!expanded)}>
      {beacon.is_drill && <DrillBanner />}

      <View style={styles.header}>
        <View style={styles.pulsingDot} />
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {ui?.beacon_from ?? 'Beacon from'} {displayName}
          </Text>
          <Text style={styles.subtitle}>
            {ui?.beacon_last_seen ?? 'Last seen'} {lastSeenAgo} ago
            {'  ·  '}
            {ui?.beacon_duration ?? 'Active for'} {activeDuration}
          </Text>
        </View>
      </View>

      {expanded && positions.length > 0 && (
        <View style={styles.positionsSection}>
          <Text style={styles.positionsTitle}>
            {ui?.beacon_positions ?? 'Position History'}
          </Text>
          {positions.map((p) => (
            <View key={p.id} style={styles.posRow}>
              <Text style={styles.posCoords}>
                {p.gps_lat.toFixed(5)}, {p.gps_lon.toFixed(5)}
              </Text>
              <Text style={styles.posTime}>
                {new Date(p.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.ackBtn} onPress={handleAcknowledge}>
        <Text style={styles.ackBtnText}>
          {'\u2705'} Acknowledge
        </Text>
      </Pressable>
    </Pressable>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  positionsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  positionsTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  posRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  posCoords: {
    color: '#f1f5f9',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  posTime: {
    color: '#64748b',
    fontSize: 12,
  },
  ackBtn: {
    backgroundColor: '#166534',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  ackBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
