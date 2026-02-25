import { View, Text, StyleSheet } from 'react-native';
import type { Severity, LanguageFile } from '@mecp/engine';

const SEV_COLORS: Record<number, string> = {
  0: '#dc2626',
  1: '#ea580c',
  2: '#b45309',
  3: '#2563eb',
};

const SEV_BG: Record<number, string> = {
  0: 'rgba(220,38,38,0.15)',
  1: 'rgba(234,88,12,0.15)',
  2: 'rgba(180,83,9,0.15)',
  3: 'rgba(37,99,235,0.15)',
};

const SEV_ICONS: Record<number, string> = {
  0: '\u26A0',
  1: '\u23F1',
  2: '\u{1F6E1}',
  3: '\u2139',
};

const SEV_FALLBACK: Record<number, string> = {
  0: 'MAYDAY',
  1: 'URGENT',
  2: 'SAFETY',
  3: 'ROUTINE',
};

interface Props {
  severity: Severity;
  langFile: LanguageFile | null;
  large?: boolean;
}

export function SeverityBadge({ severity, langFile, large }: Props) {
  const color = SEV_COLORS[severity] ?? '#64748b';
  const bg = SEV_BG[severity] ?? 'transparent';
  const icon = SEV_ICONS[severity] ?? '';
  const label =
    langFile?.severities?.[String(severity)]?.local ??
    SEV_FALLBACK[severity] ??
    `SEV ${severity}`;

  if (large) {
    return (
      <View style={[styles.large, { backgroundColor: bg, borderColor: color }]}>
        <Text style={styles.largeIcon}>{icon}</Text>
        <Text style={[styles.largeLabel, { color }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color }]}>
      <Text style={styles.badgeIcon}>{icon}</Text>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    fontSize: 12,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  largeIcon: {
    fontSize: 22,
  },
  largeLabel: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
