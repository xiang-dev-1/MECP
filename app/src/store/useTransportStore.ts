import { create } from 'zustand';
import type {
  MeshTransport,
  TransportStatus,
  SenderIdentity,
} from '../transport/types';
import { transportManager } from '../transport/TransportManager';
import { messageQueue } from '../storage/messageQueue';
import { useMessageStore } from './useMessageStore';
import { useDeduplication } from '../hooks/useDeduplication';

interface TransportState {
  status: TransportStatus;
  transport: MeshTransport | null;
  nodes: SenderIdentity[];
  error: string | null;

  initialize: () => void;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useTransportStore = create<TransportState>((set, get) => ({
  status: 'disconnected',
  transport: null,
  nodes: [],
  error: null,

  initialize: () => {
    const dedup = new (class {
      private seen = new Map<string, number>();
      isDuplicate(key: string): boolean {
        const now = Date.now();
        // Clean old entries
        for (const [k, t] of this.seen) {
          if (now - t > 10 * 60 * 1000) this.seen.delete(k);
        }
        if (this.seen.has(key)) return true;
        this.seen.set(key, now);
        return false;
      }
    })();

    // Listen for status changes
    transportManager.onStatusChange((status) => {
      set({ status, nodes: transportManager.getNodes() });

      // Drain outbox when connected
      if (status === 'connected') {
        messageQueue.drain(transportManager);
      }
    });

    // Listen for incoming messages
    transportManager.onMessage((msg) => {
      // Deduplication: hash sender + text
      const key = `${msg.sender.nodeId}:${msg.text}`;
      if (dedup.isDuplicate(key)) return;

      useMessageStore.getState().receiveMessage(msg);
    });

    set({ transport: transportManager });
  },

  connect: async (deviceId) => {
    set({ error: null });
    try {
      await transportManager.connect(deviceId);
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },

  disconnect: async () => {
    await transportManager.disconnect();
  },
}));
