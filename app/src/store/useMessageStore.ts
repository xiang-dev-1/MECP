import { create } from 'zustand';
import {
  getMessages,
  insertMessage,
  insertOutbox,
  type StoredMessage,
} from '../storage/database';
import { decode, type Severity } from '@mecp/engine';
import type { MeshTransport, IncomingMessage } from '../transport/types';

interface MessageState {
  messages: StoredMessage[];
  loadMessages: () => Promise<void>;
  sendMessage: (
    rawString: string,
    severity: Severity,
    codes: string[],
    transport: MeshTransport | null
  ) => Promise<void>;
  receiveMessage: (incoming: IncomingMessage) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],

  loadMessages: async () => {
    const msgs = await getMessages(200);
    set({ messages: msgs });
  },

  sendMessage: async (rawString, severity, codes, transport) => {
    const parsed = decode(rawString);

    if (transport && transport.getStatus() === 'connected') {
      // Send immediately
      await transport.sendText(rawString);
      const id = await insertMessage({
        raw_string: rawString,
        severity,
        codes: JSON.stringify(codes),
        freetext: parsed.freetext,
        is_mecp: true,
        is_drill: parsed.isDrill,
        direction: 'sent',
        sender_node_id: null,
        sender_display_name: null,
        channel: null,
        timestamp_received: Date.now(),
        gps_lat: parsed.extracted.gps?.lat ?? null,
        gps_lon: parsed.extracted.gps?.lon ?? null,
        reference_tag: parsed.extracted.reference,
        is_read: true,
        is_pinned: false,
        rssi: null,
        snr: null,
      });
    } else {
      // Queue for later
      await insertOutbox(rawString, null, severity);
    }

    // Refresh messages list
    await get().loadMessages();
  },

  receiveMessage: async (incoming) => {
    const parsed = decode(incoming.text);

    await insertMessage({
      raw_string: incoming.text,
      severity: parsed.severity,
      codes: parsed.codes.length > 0 ? JSON.stringify(parsed.codes) : null,
      freetext: parsed.freetext,
      is_mecp: parsed.valid,
      is_drill: parsed.isDrill,
      direction: 'received',
      sender_node_id: incoming.sender.nodeId,
      sender_display_name: incoming.sender.displayName,
      channel: incoming.channel,
      timestamp_received: incoming.timestamp.getTime(),
      gps_lat: parsed.extracted.gps?.lat ?? null,
      gps_lon: parsed.extracted.gps?.lon ?? null,
      reference_tag: parsed.extracted.reference,
      is_read: false,
      is_pinned: false,
      rssi: incoming.signal?.rssi ?? null,
      snr: incoming.signal?.snr ?? null,
    });

    // Refresh messages list
    await get().loadMessages();
  },
}));
