import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LanguageFile } from '@mecp/engine';

interface Props {
  category: string;
  langFile: LanguageFile | null;
  enFile: LanguageFile | null;
  selected: string[];
  onToggle: (code: string) => void;
  showBilingual?: boolean;
}

export function CodeChecklist({
  category,
  langFile,
  enFile,
  selected,
  onToggle,
  showBilingual = true,
}: Props) {
  const codes = langFile
    ? Object.entries(langFile.codes)
        .filter(([code]) => code.startsWith(category))
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <View>
      {codes.map(([code, text]) => {
        const isSelected = selected.includes(code);
        return (
          <Pressable
            key={code}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => onToggle(code)}
          >
            <View style={[styles.checkbox, isSelected && styles.checked]}>
              {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
            </View>
            <Text style={styles.codeId}>{code}</Text>
            <View style={styles.texts}>
              <Text style={styles.localText}>{text}</Text>
              {showBilingual &&
                langFile?.language !== 'en' &&
                enFile && (
                  <Text style={styles.enText}>{enFile.codes[code] ?? ''}</Text>
                )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  rowSelected: {
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  codeId: {
    color: '#94a3b8',
    fontFamily: 'monospace',
    width: 40,
    fontWeight: '600',
  },
  texts: {
    flex: 1,
  },
  localText: {
    color: '#f1f5f9',
    fontSize: 15,
  },
  enText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
