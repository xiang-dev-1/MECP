import { View, Text, StyleSheet } from 'react-native';
import type { LanguageFile } from '@mecp/engine';

interface Props {
  langFile: LanguageFile | null;
}

export function DrillBanner({ langFile }: Props) {
  const label = langFile?.ui?.drill ?? 'DRILL';

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.subtitle}>
        {langFile?.ui?.drill_message ?? 'This is a drill — not a real emergency'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
