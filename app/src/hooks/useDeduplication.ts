/**
 * Message deduplication for LoRa mesh flood-routing.
 * Uses a sliding window (default 10 minutes) to filter duplicate messages.
 * Key = hash of (sender_node_id + raw_text).
 */
export class Deduplicator {
  private seen = new Map<string, number>();
  private windowMs: number;

  constructor(windowMs: number = 10 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  /**
   * Returns true if this key was seen within the window.
   * If not seen, records it and returns false.
   */
  isDuplicate(key: string): boolean {
    this.prune();
    if (this.seen.has(key)) return true;
    this.seen.set(key, Date.now());
    return false;
  }

  /** Build a dedup key from sender ID and message text */
  static makeKey(senderNodeId: string, text: string): string {
    return `${senderNodeId}:${text}`;
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamp] of this.seen) {
      if (timestamp < cutoff) {
        this.seen.delete(key);
      }
    }
  }
}

/** Singleton instance */
export const deduplicator = new Deduplicator();
