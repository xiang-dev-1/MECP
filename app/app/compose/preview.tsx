import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useTransportStore } from '@/store/useTransportStore';
import { getLanguage } from '@/i18n/languages';
import { useLocation } from '@/hooks/useLocation';
import { encode, getByteLength, type Severity } from '@mecp/engine';
import { MaydayButton } from '@/components/MaydayButton';
import { SeverityBadge } from '@/components/SeverityBadge';
import { Platform } from 'react-native';
import { useBeaconStore } from '@/store/useBeaconStore';

export default function PreviewScreen() {
  const router = useRouter();
  const { severity: sevStr, selectedCodes: codesStr } = useLocalSearchParams<{
    severity: string;
    selectedCodes: string;
  }>();
  const severity = Number(sevStr) as Severity;
  const codes: string[] = codesStr ? JSON.parse(codesStr) : [];

  const lang = useSettingsStore((s) => s.language);
  const autoGps = useSettingsStore((s) => s.autoGps);
  const autoTimestamp = useSettingsStore((s) => s.autoTimestamp);
  const langFile = getLanguage(lang);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const transport = useTransportStore((s) => s.transport);
  const transportStatus = useTransportStore((s) => s.status);

  const [freetext, setFreetext] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [gpsEnabled, setGpsEnabled] = useState(autoGps && severity <= 1);
  const [tsEnabled, setTsEnabled] = useState(autoTimestamp);

  const location = useLocation(gpsEnabled);

  // Build auto-tags
  const autoTags = useMemo(() => {
    const parts: string[] = [];
    if (paxCount > 0) {
      parts.push(`${paxCount}pax`);
    }
    if (gpsEnabled && location) {
      parts.push(`${location.lat.toFixed(5)},${location.lon.toFixed(5)}`);
    }
    if (tsEnabled) {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      parts.push(`@${hh}${mm}`);
    }
    if (lang !== 'en') {
      parts.push(`@${lang}`);
    }
    return parts;
  }, [paxCount, gpsEnabled, location, tsEnabled, lang]);

  const fullFreetext = [...autoTags, freetext].filter(Boolean).join(' ');
  const result = encode(severity, codes, fullFreetext || undefined);

  const activateBeacon = useBeaconStore((s) => s.activateBeacon);
  const startAckLoop = useBeaconStore((s) => s.startAckLoop);
  const isDrill = codes.includes('D01') || codes.includes('D02');

  const handleSend = async () => {
    try {
      await sendMessage(result.message, severity, codes, transport);
      // Start ACK loop for MAYDAY messages
      if (severity === 0) {
        startAckLoop(Date.now());
      }
      router.dismissAll();
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const doActivateBeacon = async () => {
    try {
      // Send initial MAYDAY
      await sendMessage(result.message, severity, codes, transport);
      // Create beacon session
      await activateBeacon(codes, fullFreetext || null, severity, isDrill);
      // Start background service (native only)
      if (Platform.OS !== 'web') {
        const { startBeacon } = await import('@/services/beaconService');
        await startBeacon();
      }
      // Start ACK loop
      startAckLoop(Date.now());
      // Navigate to beacon status
      router.dismissAll();
      router.push('/beacon/status');
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert(String(err));
      } else {
        Alert.alert('Error', String(err));
      }
    }
  };

  const handleActivateBeacon = () => {
    const confirmMsg = langFile?.ui?.beacon_confirm
      ?? 'Activate distress beacon? This will broadcast your position automatically.';
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doActivateBeacon();
      }
    } else {
      Alert.alert(
        langFile?.ui?.activate_beacon ?? 'Activate Beacon',
        confirmMsg,
        [
          { text: langFile?.ui?.cancel ?? 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: doActivateBeacon },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SeverityBadge severity={severity} langFile={langFile} />

        {/* Selected codes */}
        <View style={styles.chipRow}>
          {codes.map((code) => (
            <View key={code} style={styles.chip}>
              <Text style={styles.chipText}>{code}</Text>
              <Text style={styles.chipLabel}>
                {langFile?.codes[code] ?? code}
              </Text>
            </View>
          ))}
        </View>

        {/* Pax count */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {langFile?.ui?.person_count ?? 'Person count'}
          </Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, paxCount <= 0 && styles.stepBtnDisabled]}
              onPress={() => setPaxCount((c) => Math.max(0, c - 1))}
              disabled={paxCount <= 0}
            >
              <Text style={styles.stepBtnText}>{'\u2212'}</Text>
            </Pressable>
            <Text style={styles.stepValue}>{paxCount}</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setPaxCount((c) => Math.min(999, c + 1))}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Auto tags */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {langFile?.ui?.attach_gps ?? 'Attach GPS'}
          </Text>
          <Switch
            value={gpsEnabled}
            onValueChange={setGpsEnabled}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#f1f5f9"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {langFile?.ui?.attach_timestamp ?? 'Timestamp (UTC)'}
          </Text>
          <Switch
            value={tsEnabled}
            onValueChange={setTsEnabled}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#f1f5f9"
          />
        </View>

        {/* Freetext */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {langFile?.ui?.freetext ?? 'Freetext'}
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={freetext}
            onChangeText={setFreetext}
            multiline
            placeholder={langFile?.ui?.freetext_placeholder ?? 'Optional freetext...'}
            placeholderTextColor="#64748b"
            maxLength={120}
          />
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{langFile?.ui?.mecp_message ?? 'MECP Message'}</Text>
          <Text style={styles.previewText}>{result.message}</Text>
          <Text
            style={[
              styles.byteCount,
              result.overLimit && styles.byteCountOver,
            ]}
          >
            {result.byteLength}/200 bytes
          </Text>
          {result.warnings.map((w, i) => (
            <Text key={i} style={styles.warning}>
              {w}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* Send button */}
      <View style={styles.sendBar}>
        {transportStatus !== 'connected' && (
          <Text style={styles.queueNote}>
            {langFile?.ui?.no_radio_queued ?? 'No radio connected \u2014 message will be queued'}
          </Text>
        )}
        {severity === 0 ? (
          <View style={{ gap: 10 }}>
            <MaydayButton
              onComplete={handleSend}
              disabled={result.overLimit || codes.length === 0}
            />
            <Pressable
              style={[
                styles.beaconBtn,
                (result.overLimit || codes.length === 0) && styles.btnDisabled,
              ]}
              onPress={handleActivateBeacon}
              disabled={result.overLimit || codes.length === 0}
            >
              <Text style={styles.beaconBtnText}>
                {langFile?.ui?.activate_beacon ?? 'Activate Beacon'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[
              styles.sendBtn,
              (result.overLimit || codes.length === 0) && styles.btnDisabled,
            ]}
            onPress={handleSend}
            disabled={result.overLimit || codes.length === 0}
          >
            <Text style={styles.sendBtnText}>
              {langFile?.ui?.send ?? 'Send'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  chipLabel: {
    color: '#f1f5f9',
    fontSize: 13,
    marginTop: 2,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  stepBtn: {
    width: 52,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepBtnText: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  stepValue: {
    width: 56,
    textAlign: 'center',
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 15,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleLabel: {
    color: '#f1f5f9',
    fontSize: 15,
  },
  preview: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewText: {
    color: '#f1f5f9',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  byteCount: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  byteCountOver: {
    color: '#ef4444',
    fontWeight: '700',
  },
  warning: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 4,
  },
  sendBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  queueNote: {
    color: '#f59e0b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  beaconBtn: {
    backgroundColor: '#d97706',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  beaconBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
