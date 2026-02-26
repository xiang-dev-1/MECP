import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMessageStore } from '@/store/useMessageStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBeaconStore } from '@/store/useBeaconStore';
import { MessageCard } from '@/components/MessageCard';
import { BeaconCard } from '@/components/BeaconCard';
import { getLanguage } from '@/i18n/languages';
import type { StoredMessage } from '@/storage/database';

type Filter = 'all' | 0 | 1 | 2 | 3 | 'sent';

const FILTER_KEYS: Filter[] = ['all', 0, 1, 2, 3, 'sent'];

export default function InboxTab() {
  const router = useRouter();
  const messages = useMessageStore((s) => s.messages);
  const loadMessages = useMessageStore((s) => s.loadMessages);
  const receivedBeacons = useBeaconStore((s) => s.receivedBeacons);
  const loadReceivedBeacons = useBeaconStore((s) => s.loadReceivedBeacons);
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      loadReceivedBeacons();
    }, [loadMessages, loadReceivedBeacons])
  );

  const filtered = messages.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return m.direction === 'sent';
    return m.severity === filter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTER_KEYS.map((key) => {
          const label =
            key === 'all'
              ? langFile?.ui?.all_filter ?? 'All'
              : key === 'sent'
                ? langFile?.ui?.sent ?? 'Sent'
                : langFile?.severities?.[String(key)]?.local ?? ['MAYDAY','URGENT','SAFETY','ROUTINE'][key];
          return (
            <Pressable
              key={String(key)}
              style={[styles.filterChip, filter === key && styles.filterActive]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* Active beacons from other senders */}
      {receivedBeacons.length > 0 && (
        <View>
          {receivedBeacons.map((b) => (
            <BeaconCard key={b.id} beacon={b} langFile={langFile} />
          ))}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => (
          <MessageCard
            message={item}
            langFile={langFile}
            onPress={() =>
              router.push({ pathname: '/message/[id]', params: { id: String(item.id) } })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{langFile?.ui?.no_messages ?? 'No messages'}</Text>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
