import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LanguageFile, CategoryLetter } from '@mecp/engine';
import { CATEGORIES } from '@mecp/engine';

const CATEGORY_ORDER = Object.entries(CATEGORIES)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([letter]) => letter as CategoryLetter);

const CATEGORY_ICONS: Record<string, string> = {
  M: '\u2695',
  T: '\u26A0',
  W: '\u2601',
  S: '\u{1F4E6}',
  P: '\u{1F4CD}',
  C: '\u{1F4E1}',
  R: '\u{1F6A8}',
  D: '\u{1F3AF}',
  L: '\u{1F3D5}',
  X: '\u26A1',
  H: '\u{1F91D}',
};

interface Props {
  langFile: LanguageFile | null;
  onSelect: (category: CategoryLetter) => void;
}

export function CategoryGrid({ langFile, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {CATEGORY_ORDER.map((cat) => {
        const catDef = langFile?.categories[cat];
        return (
          <Pressable
            key={cat}
            style={styles.cell}
            onPress={() => onSelect(cat)}
          >
            <Text style={styles.icon}>{CATEGORY_ICONS[cat] ?? cat}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {catDef?.name ?? cat}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  cell: {
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
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  name: {
    color: '#f1f5f9',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
});
