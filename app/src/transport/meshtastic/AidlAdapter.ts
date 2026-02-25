import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type {
  MeshTransport,
  TransportStatus,
  IncomingMessage,
  SenderIdentity,
} from '../types';
import { NodeDB } from './nodedb';

const { MeshtasticAidl } = NativeModules;

/**
 * Meshtastic AIDL transport adapter for Android.
 *
 * Communicates with the Meshtastic Android app via AIDL service binding.
 * The Meshtastic app handles BLE connection to the radio — we piggyback
 * on that existing connection.
 *
 * Sends and receives TEXT_MESSAGE_APP (portnum 1) messages.
 */
export class MeshtasticAidlAdapter implements MeshTransport {
  private status: TransportStatus = 'disconnected';
  private statusListeners = new Set<(s: TransportStatus) => void>();
  private messageListeners = new Set<(m: IncomingMessage) => void>();
  private emitter: NativeEventEmitter | null = null;
  private subscriptions: { remove: () => void }[] = [];
  private nodeDB = new NodeDB();

  constructor() {
    if (Platform.OS !== 'android') {
      console.warn('MeshtasticAidlAdapter is Android-only');
      return;
    }
    if (!MeshtasticAidl) {
      console.warn('MeshtasticAidl native module not available');
      return;
    }
    this.emitter = new NativeEventEmitter(MeshtasticAidl);
  }

  async connect(_deviceId: string): Promise<void> {
    if (!MeshtasticAidl) {
      throw new Error('Meshtastic native module not available');
    }

    this.setStatus('connecting');

    try {
      await MeshtasticAidl.bindService();
      this.setupEventListeners();

      // Load initial node database
      const nodes = await MeshtasticAidl.getNodes();
      for (const node of nodes) {
        this.nodeDB.upsert({
          nodeId: node.nodeId,
          displayName: node.longName ?? node.nodeId,
          shortName: node.shortName ?? '????',
          platform: 'meshtastic',
        });
      }

      this.setStatus('connected');
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.subscriptions.forEach((s) => s.remove());
    this.subscriptions = [];

    if (MeshtasticAidl) {
      try {
        await MeshtasticAidl.unbindService();
      } catch {
        // Ignore errors on unbind
      }
    }

    this.setStatus('disconnected');
  }

  async sendText(text: string, channel?: number): Promise<void> {
    if (!MeshtasticAidl) {
      throw new Error('Meshtastic native module not available');
    }
    if (this.status !== 'connected') {
      throw new Error('Not connected to Meshtastic service');
    }

    await MeshtasticAidl.sendText(text, channel ?? 0);
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
    return this.status;
  }

  getNodes(): SenderIdentity[] {
    return this.nodeDB.getAll();
  }

  private setStatus(status: TransportStatus): void {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  private setupEventListeners(): void {
    if (!this.emitter) return;

    // Incoming text messages (portnum 1 = TEXT_MESSAGE_APP)
    const msgSub = this.emitter.addListener(
      'MeshtasticMessage',
      (event: {
        text: string;
        fromNodeId: string;
        channel: string | null;
        timestamp: number;
        rssi?: number;
        snr?: number;
      }) => {
        const sender = this.nodeDB.get(event.fromNodeId) ?? {
          nodeId: event.fromNodeId,
          displayName: event.fromNodeId,
          shortName: '????',
          platform: 'meshtastic' as const,
        };

        const msg: IncomingMessage = {
          text: event.text,
          sender,
          channel: event.channel,
          timestamp: new Date(event.timestamp),
          signal:
            event.rssi != null
              ? { rssi: event.rssi, snr: event.snr ?? 0 }
              : undefined,
        };

        this.messageListeners.forEach((cb) => cb(msg));
      }
    );

    // Node info updates
    const nodeSub = this.emitter.addListener(
      'MeshtasticNodeUpdate',
      (event: {
        nodeId: string;
        longName?: string;
        shortName?: string;
      }) => {
        this.nodeDB.upsert({
          nodeId: event.nodeId,
          displayName: event.longName ?? event.nodeId,
          shortName: event.shortName ?? '????',
          platform: 'meshtastic',
        });
      }
    );

    // Connection status changes
    const statusSub = this.emitter.addListener(
      'MeshtasticConnectionStatus',
      (event: { connected: boolean }) => {
        this.setStatus(event.connected ? 'connected' : 'disconnected');
      }
    );

    this.subscriptions.push(msgSub, nodeSub, statusSub);
  }
}
