import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LanguageFile } from '@mecp/engine';
import { decode, isMECP } from '@mecp/engine';
import type { StoredMessage } from '../storage/database';
import { SeverityBadge } from './SeverityBadge';

const SEV_COLORS: Record<number, string> = {
  0: '#dc2626',
  1: '#ea580c',
  2: '#b45309',
  3: '#2563eb',
};

interface Props {
  message: StoredMessage;
  langFile: LanguageFile | null;
  onPress: () => void;
}

export function MessageCard({ message, langFile, onPress }: Props) {
  const parsed = isMECP(message.raw_string)
    ? decode(message.raw_string)
    : null;

  const isSent = message.direction === 'sent';
  const senderName =
    message.sender_display_name ?? (isSent ? 'You' : 'Unknown');

  // Build summary line
  let summary: string;
  if (parsed?.valid && langFile) {
    const codeTexts = parsed.codes
      .slice(0, 3)
      .map((c) => langFile.codes[c] ?? c);
    summary = codeTexts.join(', ');
    if (parsed.codes.length > 3) summary += ` +${parsed.codes.length - 3}`;
  } else {
    summary = message.raw_string.slice(0, 80);
  }

  const time = new Date(message.timestamp_received);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  return (
    <Pressable
      style={[
        styles.card,
        parsed?.isDrill && styles.drillCard,
        !message.is_read && !isSent && styles.unread,
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        {parsed?.valid && parsed.severity !== null && (
          <SeverityBadge severity={parsed.severity} langFile={langFile} />
        )}
        {isSent && (
          <View style={styles.sentBadge}>
            <Text style={styles.sentText}>SENT</Text>
          </View>
        )}
        <Text style={styles.time}>{timeStr}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sender}>{senderName}</Text>
        <Text style={styles.summary} numberOfLines={2}>
          {summary}
        </Text>
      </View>

      {parsed?.isDrill && (
        <Text style={styles.drillLabel}>DRILL</Text>
      )}

      {parsed?.extracted.count != null && (
        <Text style={styles.paxBadge}>{parsed.extracted.count} pax</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  drillCard: {
    borderStyle: 'dashed',
    borderColor: '#f59e0b',
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sentBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sentText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
  },
  time: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
    marginLeft: 'auto',
  },
  body: {
    gap: 2,
  },
  sender: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  summary: {
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 20,
  },
  drillLabel: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  paxBadge: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
