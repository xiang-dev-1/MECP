import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getLanguage } from '@/i18n/languages';
import { getMessageById, type StoredMessage } from '@/storage/database';
import { decode, getCategory, type ParsedMessage } from '@mecp/engine';
import { SeverityBadge } from '@/components/SeverityBadge';
import { DrillBanner } from '@/components/DrillBanner';
import * as Clipboard from 'expo-constants';

const SEV_COLORS = ['#dc2626', '#ea580c', '#b45309', '#2563eb'];

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useSettingsStore((s) => s.language);
  const langFile = getLanguage(lang);
  const enFile = getLanguage('en');
  const [message, setMessage] = useState<StoredMessage | null>(null);
  const [parsed, setParsed] = useState<ParsedMessage | null>(null);

  useEffect(() => {
    if (id) {
      getMessageById(Number(id)).then((msg) => {
        if (msg) {
          setMessage(msg);
          setParsed(decode(msg.raw_string));
        }
      });
    }
  }, [id]);

  if (!message || !parsed) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const openMaps = (lat: number, lon: number) => {
    Linking.openURL(`geo:${lat},${lon}?q=${lat},${lon}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Severity header */}
      {parsed.valid && parsed.severity !== null && (
        <SeverityBadge severity={parsed.severity} langFile={langFile} large />
      )}

      {/* Drill banner */}
      {parsed.isDrill && <DrillBanner langFile={langFile} />}

      {/* Sender info */}
      {message.sender_display_name && (
        <View style={styles.senderRow}>
          <Text style={styles.senderLabel}>From</Text>
          <Text style={styles.senderName}>{message.sender_display_name}</Text>
          {message.sender_node_id && (
            <Text style={styles.senderNode}>{message.sender_node_id}</Text>
          )}
        </View>
      )}

      {/* Signal info */}
      {(message.rssi != null || message.snr != null) && (
        <View style={styles.signalRow}>
          {message.rssi != null && (
            <Text style={styles.signalText}>RSSI: {message.rssi} dBm</Text>
          )}
          {message.snr != null && (
            <Text style={styles.signalText}>SNR: {message.snr} dB</Text>
          )}
        </View>
      )}

      {/* Decoded codes */}
      {parsed.valid && parsed.codes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Codes</Text>
          {parsed.codes.map((code) => {
            const cat = getCategory(code);
            const catDef = langFile?.categories[cat];
            return (
              <View key={code} style={styles.codeRow}>
                <Text style={styles.codeId}>{code}</Text>
                <View style={styles.codeTexts}>
                  <Text style={styles.codeLocal}>
                    {langFile?.codes[code] ?? code}
                  </Text>
                  {lang !== 'en' && enFile && (
                    <Text style={styles.codeEn}>
                      {enFile.codes[code] ?? ''}
                    </Text>
                  )}
                </View>
                <Text style={styles.catLabel}>{catDef?.name ?? cat}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Extracted data */}
      {parsed.valid && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          {parsed.extracted.count != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Persons</Text>
              <Text style={styles.detailValue}>{parsed.extracted.count}</Text>
            </View>
          )}

          {parsed.extracted.gps && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>GPS</Text>
              <Pressable
                onPress={() =>
                  openMaps(
                    parsed.extracted.gps!.lat,
                    parsed.extracted.gps!.lon
                  )
                }
              >
                <Text style={styles.detailLink}>
                  {parsed.extracted.gps.lat.toFixed(5)},{' '}
                  {parsed.extracted.gps.lon.toFixed(5)}
                  {' \u2197'}
                </Text>
              </Pressable>
            </View>
          )}

          {parsed.extracted.eta != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ETA</Text>
              <Text style={styles.detailValue}>
                {parsed.extracted.eta} min
              </Text>
            </View>
          )}

          {parsed.extracted.reference && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.detailValue}>
                #{parsed.extracted.reference}
              </Text>
            </View>
          )}

          {parsed.extracted.timestamp && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time (UTC)</Text>
              <Text style={styles.detailValue}>
                {parsed.extracted.timestamp.slice(0, 2)}:
                {parsed.extracted.timestamp.slice(2, 4)}
              </Text>
            </View>
          )}

          {parsed.extracted.language && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>
                {parsed.extracted.language}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Freetext */}
      {parsed.freetext && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Freetext</Text>
          <Text style={styles.freetext}>{parsed.freetext}</Text>
          <Text style={styles.freetextNote}>
            Freetext is not translated — shown as sent
          </Text>
        </View>
      )}

      {/* Non-MECP messages */}
      {!parsed.valid && (
        <View style={styles.section}>
          <Text style={styles.plainText}>{message.raw_string}</Text>
        </View>
      )}

      {/* Raw string */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Raw Message</Text>
        <View style={styles.rawBox}>
          <Text style={styles.rawText}>{message.raw_string}</Text>
        </View>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {new Date(message.timestamp_received).toLocaleString()}
      </Text>
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
    paddingBottom: 40,
  },
  loading: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  senderLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  senderName: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
  },
  senderNode: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  signalRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  signalText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 10,
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
    fontSize: 14,
  },
  codeEn: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  catLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  detailValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  detailLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  freetext: {
    color: '#f1f5f9',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  freetextNote: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  plainText: {
    color: '#f1f5f9',
    fontSize: 16,
    lineHeight: 24,
  },
  rawBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rawText: {
    color: '#f1f5f9',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  timestamp: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
