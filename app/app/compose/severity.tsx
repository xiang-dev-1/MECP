import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import { SeverityButton } from '@/components/SeverityButton';
import type { Severity } from '@mecp/engine';

export default function SeverityScreen() {
  const router = useRouter();
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);

  const handleSeverity = (severity: Severity) => {
    router.push({
      pathname: '/compose/category',
      params: { severity: String(severity) },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {langFile?.ui?.severity_select ?? 'Select Severity'}
      </Text>
      <View style={styles.buttons}>
        {([0, 1, 2, 3] as Severity[]).map((sev) => (
          <SeverityButton
            key={sev}
            severity={sev}
            langFile={langFile}
            onPress={() => handleSeverity(sev)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    justifyContent: 'center',
  },
  heading: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    gap: 12,
  },
});
