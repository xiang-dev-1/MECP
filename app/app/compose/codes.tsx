import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import { getByteLength, encode, type Severity } from '@mecp/engine';

export default function CodesScreen() {
  const router = useRouter();
  const { severity, category, selectedCodes: existingCodes } =
    useLocalSearchParams<{
      severity: string;
      category: string;
      selectedCodes?: string;
    }>();
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const enFile = getLanguage('en');

  const parsedExisting: string[] = existingCodes
    ? JSON.parse(existingCodes)
    : [];
  const [selected, setSelected] = useState<string[]>(parsedExisting);

  // Get codes for this category
  const categoryCodes = langFile
    ? Object.entries(langFile.codes)
        .filter(([code]) => code.startsWith(category))
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  const toggleCode = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const removeCode = (code: string) => {
    setSelected((prev) => prev.filter((c) => c !== code));
  };

  // Byte budget preview
  const sev = Number(severity) as Severity;
  const previewResult = encode(sev, selected, '');
  const bytesUsed = previewResult.byteLength;

  const goToMoreCategories = () => {
    router.push({
      pathname: '/compose/category',
      params: {
        severity,
        selectedCodes: JSON.stringify(selected),
      },
    });
  };

  const goToPreview = () => {
    router.push({
      pathname: '/compose/preview',
      params: {
        severity,
        selectedCodes: JSON.stringify(selected),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Selected codes chips */}
      {selected.length > 0 && (
        <View style={styles.chipRow}>
          {selected.map((code) => (
            <Pressable
              key={code}
              style={styles.chip}
              onPress={() => removeCode(code)}
            >
              <Text style={styles.chipText}>{code} \u00D7</Text>
            </Pressable>
          ))}
          <Text style={styles.byteCount}>
            {bytesUsed}/200 bytes
          </Text>
        </View>
      )}

      <ScrollView style={styles.list}>
        {categoryCodes.map(([code, text]) => {
          const isSelected = selected.includes(code);
          return (
            <Pressable
              key={code}
              style={[styles.codeRow, isSelected && styles.codeRowSelected]}
              onPress={() => toggleCode(code)}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
              </View>
              <Text style={styles.codeId}>{code}</Text>
              <View style={styles.codeTexts}>
                <Text style={styles.codeLocal}>{text}</Text>
                {lang !== 'en' && enFile && (
                  <Text style={styles.codeEn}>{enFile.codes[code] ?? ''}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.btnSecondary} onPress={goToMoreCategories}>
          <Text style={styles.btnSecondaryText}>
            {langFile?.ui?.add_more ?? '+ Add more'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, selected.length === 0 && styles.btnDisabled]}
          onPress={goToPreview}
          disabled={selected.length === 0}
        >
          <Text style={styles.btnPrimaryText}>
            {langFile?.ui?.next ?? 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
  byteCount: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 'auto',
  },
  list: {
    flex: 1,
    padding: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  codeRowSelected: {
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
  checkboxChecked: {
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
  codeTexts: {
    flex: 1,
  },
  codeLocal: {
    color: '#f1f5f9',
    fontSize: 15,
  },
  codeEn: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#f1f5f9',
    fontWeight: '600',
    fontSize: 15,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
