import type {
  MeshTransport,
  TransportStatus,
  IncomingMessage,
  SenderIdentity,
} from './types';

/**
 * Manages the active transport adapter.
 * Provides a singleton interface that UI code binds to.
 * The actual adapter (AIDL, BLE, etc.) is plugged in at runtime.
 */
export class TransportManager implements MeshTransport {
  private adapter: MeshTransport | null = null;
  private statusListeners = new Set<(status: TransportStatus) => void>();
  private messageListeners = new Set<(msg: IncomingMessage) => void>();
  private adapterCleanups: (() => void)[] = [];

  /** Set the active transport adapter */
  setAdapter(adapter: MeshTransport): void {
    // Clean up previous adapter subscriptions
    this.adapterCleanups.forEach((fn) => fn());
    this.adapterCleanups = [];

    this.adapter = adapter;

    // Forward adapter events to our listeners
    const unsubStatus = adapter.onStatusChange((status) => {
      this.statusListeners.forEach((cb) => cb(status));
    });
    const unsubMsg = adapter.onMessage((msg) => {
      this.messageListeners.forEach((cb) => cb(msg));
    });

    this.adapterCleanups.push(unsubStatus, unsubMsg);

    // Notify current status
    const currentStatus = adapter.getStatus();
    this.statusListeners.forEach((cb) => cb(currentStatus));
  }

  async connect(deviceId: string): Promise<void> {
    if (!this.adapter) throw new Error('No transport adapter configured');
    return this.adapter.connect(deviceId);
  }

  async disconnect(): Promise<void> {
    if (!this.adapter) return;
    return this.adapter.disconnect();
  }

  async sendText(text: string, channel?: number): Promise<void> {
    if (!this.adapter) throw new Error('No transport adapter configured');
    return this.adapter.sendText(text, channel);
  }

  onMessage(cb: (msg: IncomingMessage) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onStatusChange(cb: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  getStatus(): TransportStatus {
    return this.adapter?.getStatus() ?? 'disconnected';
  }

  getNodes(): SenderIdentity[] {
    return this.adapter?.getNodes() ?? [];
  }
}

/** Global singleton */
export const transportManager = new TransportManager();
