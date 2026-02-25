import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { Severity, LanguageFile } from '@mecp/engine';

const SEV_COLORS: Record<Severity, string> = {
  0: '#dc2626',
  1: '#ea580c',
  2: '#b45309',
  3: '#2563eb',
};

const SEV_BG: Record<Severity, string> = {
  0: 'rgba(220,38,38,0.15)',
  1: 'rgba(234,88,12,0.15)',
  2: 'rgba(180,83,9,0.15)',
  3: 'rgba(37,99,235,0.15)',
};

const SEV_LABELS: Record<Severity, string> = {
  0: 'MAYDAY',
  1: 'URGENT',
  2: 'SAFETY',
  3: 'ROUTINE',
};

const SEV_ICONS: Record<Severity, string> = {
  0: '\u26A0',  // warning
  1: '\u23F1',  // clock
  2: '\u{1F6E1}',  // shield
  3: '\u2139',  // info
};

interface Props {
  severity: Severity;
  langFile: LanguageFile | null;
  onPress: () => void;
  selected?: boolean;
}

export function SeverityButton({ severity, langFile, onPress, selected }: Props) {
  const color = SEV_COLORS[severity];
  const bg = SEV_BG[severity];
  const label =
    langFile?.severities?.[String(severity)]?.label ??
    SEV_LABELS[severity];
  const localLabel =
    langFile?.severities?.[String(severity)]?.local ??
    SEV_LABELS[severity];

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: color },
        selected && { borderWidth: severity === 0 ? 4 : severity === 3 ? 1 : severity === 1 ? 3 : 2 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.icon}>{SEV_ICONS[severity]}</Text>
      <View style={styles.textCol}>
        <Text style={[styles.local, { color }]}>{localLabel}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.sevNum, { color }]}>{severity}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 72,
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  textCol: {
    flex: 1,
  },
  local: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  sevNum: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    opacity: 0.5,
  },
});
