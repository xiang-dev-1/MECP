import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import { CATEGORIES, type CategoryLetter } from '@mecp/engine';

const CATEGORY_ORDER = Object.entries(CATEGORIES)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([letter]) => letter as CategoryLetter);

export default function ReferenceTab() {
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const enFile = getLanguage('en');

  if (!langFile) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Language not loaded</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {langFile.ui?.reference_card ?? 'Reference Card'}
      </Text>
      {CATEGORY_ORDER.map((cat) => {
        const catDef = langFile.categories[cat];
        const codes = Object.entries(langFile.codes).filter(
          ([code]) => code.startsWith(cat)
        );
        if (codes.length === 0) return null;

        return (
          <View key={cat} style={styles.category}>
            <Text style={styles.catHeader}>
              {cat} — {catDef?.name ?? cat}
            </Text>
            {codes.map(([code, text]) => (
              <View key={code} style={styles.codeRow}>
                <Text style={styles.codeId}>{code}</Text>
                <View style={styles.codeTexts}>
                  <Text style={styles.codeLocal}>{text}</Text>
                  {lang !== 'en' && enFile && (
                    <Text style={styles.codeEn}>
                      {enFile.codes[code] ?? ''}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        );
      })}
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
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
  },
  category: {
    marginBottom: 20,
  },
  catHeader: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  codeId: {
    color: '#94a3b8',
    fontFamily: 'monospace',
    width: 48,
    fontWeight: '600',
  },
  codeTexts: {
    flex: 1,
  },
  codeLocal: {
    color: '#f1f5f9',
    fontSize: 14,
  },
  codeEn: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
