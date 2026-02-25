import {
  getPendingOutbox,
  updateOutboxStatus,
  insertMessage,
  type OutboxEntry,
} from './database';
import type { MeshTransport } from '../transport/types';
import { decode } from '@mecp/engine';

/**
 * Offline outbox queue.
 * Drains pending messages when transport connects.
 * Severity 0 (MAYDAY) messages are sent first.
 */
export class MessageQueue {
  private draining = false;

  /**
   * Attempt to drain the outbox queue through the given transport.
   * Called when transport status changes to 'connected'.
   */
  async drain(transport: MeshTransport): Promise<void> {
    if (this.draining) return;
    if (transport.getStatus() !== 'connected') return;

    this.draining = true;

    try {
      const pending = await getPendingOutbox();

      for (const entry of pending) {
        if (transport.getStatus() !== 'connected') break;

        try {
          await updateOutboxStatus(entry.id, 'sending');
          await transport.sendText(entry.raw_string, entry.channel ?? undefined);
          await updateOutboxStatus(entry.id, 'sent');

          // Also save to messages table as sent
          const parsed = decode(entry.raw_string);
          await insertMessage({
            raw_string: entry.raw_string,
            severity: parsed.severity,
            codes: parsed.codes.length > 0 ? JSON.stringify(parsed.codes) : null,
            freetext: parsed.freetext,
            is_mecp: parsed.valid,
            is_drill: parsed.isDrill,
            direction: 'sent',
            sender_node_id: null,
            sender_display_name: null,
            channel: entry.channel != null ? String(entry.channel) : null,
            timestamp_received: Date.now(),
            gps_lat: parsed.extracted.gps?.lat ?? null,
            gps_lon: parsed.extracted.gps?.lon ?? null,
            reference_tag: parsed.extracted.reference,
            is_read: true,
            is_pinned: false,
            rssi: null,
            snr: null,
          });
        } catch {
          await updateOutboxStatus(entry.id, 'failed');
        }
      }
    } finally {
      this.draining = false;
    }
  }
}

export const messageQueue = new MessageQueue();
