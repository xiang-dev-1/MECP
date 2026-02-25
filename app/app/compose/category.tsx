import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import { CATEGORIES, type CategoryLetter } from '@mecp/engine';

const CATEGORY_ORDER = Object.entries(CATEGORIES)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([letter]) => letter as CategoryLetter);

const CATEGORY_ICONS: Record<string, string> = {
  M: '\u2695',  // medical
  T: '\u26A0',  // terrain
  W: '\u2601',  // weather
  S: '\u{1F4E6}', // supplies
  P: '\u{1F4CD}', // position
  C: '\u{1F4E1}', // coordination
  R: '\u{1F6A8}', // response
  D: '\u{1F3AF}', // drill
  L: '\u{1F3D5}',  // leisure
  X: '\u26A1',  // threat
  H: '\u{1F91D}', // resources
};

export default function CategoryScreen() {
  const router = useRouter();
  const { severity, selectedCodes: existingCodes } = useLocalSearchParams<{
    severity: string;
    selectedCodes?: string;
  }>();
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);

  const parsedCodes: string[] = existingCodes ? JSON.parse(existingCodes) : [];

  const handleCategory = (cat: CategoryLetter) => {
    router.push({
      pathname: '/compose/codes',
      params: {
        severity,
        category: cat,
        selectedCodes: JSON.stringify(parsedCodes),
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>
        {langFile?.ui?.select_category ?? 'Select Category'}
      </Text>

      {parsedCodes.length > 0 && (
        <View style={styles.chipRow}>
          {parsedCodes.map((code) => (
            <View key={code} style={styles.chip}>
              <Text style={styles.chipText}>{code}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.grid}>
        {CATEGORY_ORDER.map((cat) => {
          const catDef = langFile?.categories[cat];
          return (
            <Pressable
              key={cat}
              style={styles.catButton}
              onPress={() => handleCategory(cat)}
            >
              <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] ?? cat}</Text>
              <Text style={styles.catName}>
                {catDef?.name ?? cat}
              </Text>
              <Text style={styles.catLetter}>{cat}</Text>
            </Pressable>
          );
        })}
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
  },
  heading: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  catButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    minHeight: 64,
  },
  catIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  catName: {
    color: '#f1f5f9',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  catLetter: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
