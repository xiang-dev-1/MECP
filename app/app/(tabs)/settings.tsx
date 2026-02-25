import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTransportStore } from '@/store/useTransportStore';
import { getAllLanguages } from '@/i18n/languages';
import { DeviceStatus } from '@/components/DeviceStatus';

export default function SettingsTab() {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const autoGps = useSettingsStore((s) => s.autoGps);
  const setAutoGps = useSettingsStore((s) => s.setAutoGps);
  const autoTimestamp = useSettingsStore((s) => s.autoTimestamp);
  const setAutoTimestamp = useSettingsStore((s) => s.setAutoTimestamp);
  const status = useTransportStore((s) => s.status);
  const langs = getAllLanguages();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Device</Text>
      <DeviceStatus status={status} />

      <Text style={styles.sectionTitle}>Language</Text>
      <View style={styles.langGrid}>
        {langs.map((l) => (
          <Pressable
            key={l.language}
            style={[
              styles.langChip,
              language === l.language && styles.langChipActive,
            ]}
            onPress={() => setLanguage(l.language)}
          >
            <Text style={styles.langFlag}>{l.flag_emoji}</Text>
            <Text
              style={[
                styles.langName,
                language === l.language && styles.langNameActive,
              ]}
            >
              {l.language_name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Compose Defaults</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Auto-attach GPS (sev 0-1)</Text>
        <Switch
          value={autoGps}
          onValueChange={setAutoGps}
          trackColor={{ false: '#334155', true: '#3b82f6' }}
          thumbColor="#f1f5f9"
        />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Auto-attach timestamp</Text>
        <Switch
          value={autoTimestamp}
          onValueChange={setAutoTimestamp}
          trackColor={{ false: '#334155', true: '#3b82f6' }}
          thumbColor="#f1f5f9"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  langChipActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  langFlag: {
    fontSize: 18,
  },
  langName: {
    color: '#f1f5f9',
    fontSize: 14,
  },
  langNameActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  settingLabel: {
    color: '#f1f5f9',
    fontSize: 15,
  },
});
