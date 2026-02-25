import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMessageStore } from '@/store/useMessageStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MessageCard } from '@/components/MessageCard';
import { getLanguage } from '@/i18n/languages';
import type { StoredMessage } from '@/storage/database';

type Filter = 'all' | 0 | 1 | 2 | 3 | 'sent';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 0, label: 'MAYDAY' },
  { key: 1, label: 'URGENT' },
  { key: 2, label: 'SAFETY' },
  { key: 3, label: 'ROUTINE' },
  { key: 'sent', label: 'Sent' },
];

export default function InboxTab() {
  const router = useRouter();
  const messages = useMessageStore((s) => s.messages);
  const loadMessages = useMessageStore((s) => s.loadMessages);
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const filtered = messages.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return m.direction === 'sent';
    return m.severity === filter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={String(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
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
          <Text style={styles.empty}>No messages</Text>
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
