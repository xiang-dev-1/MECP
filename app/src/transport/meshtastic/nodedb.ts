import type { SenderIdentity } from '../types';

/**
 * In-memory node identity cache.
 * Populated from Meshtastic NODEINFO packets via AIDL.
 * Maps node IDs to display names for incoming messages.
 */
export class NodeDB {
  private nodes = new Map<string, SenderIdentity & { lastSeen: number }>();

  upsert(identity: SenderIdentity): void {
    this.nodes.set(identity.nodeId, {
      ...identity,
      lastSeen: Date.now(),
    });
  }

  get(nodeId: string): SenderIdentity | undefined {
    const entry = this.nodes.get(nodeId);
    if (!entry) return undefined;
    const { lastSeen: _, ...identity } = entry;
    return identity;
  }

  getAll(): SenderIdentity[] {
    return Array.from(this.nodes.values()).map(({ lastSeen: _, ...id }) => id);
  }

  /** Remove nodes not seen in the given duration (ms) */
  prune(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    for (const [nodeId, entry] of this.nodes) {
      if (entry.lastSeen < cutoff) {
        this.nodes.delete(nodeId);
      }
    }
  }
}
