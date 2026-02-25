/**
 * Transport layer abstraction for mesh radio communication.
 * Phase 1: Meshtastic AIDL (Android).
 * Future: MeshCore BLE, iOS direct BLE.
 */

export type TransportStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface SenderIdentity {
  /** Meshtastic long_name or MeshCore display name */
  displayName: string;
  /** Meshtastic short_name (4 chars) */
  shortName: string;
  /** Hex node ID, e.g. "!a1b2c3d4" */
  nodeId: string;
  /** Which mesh platform this node is from */
  platform: 'meshtastic' | 'meshcore';
}

export interface IncomingMessage {
  /** Raw payload — may or may not be MECP format */
  text: string;
  /** Sender identity from transport layer, NOT from MECP freetext */
  sender: SenderIdentity;
  /** Channel name/index or null for default */
  channel: string | null;
  /** Radio RX timestamp */
  timestamp: Date;
  /** Signal quality metrics */
  signal?: { rssi: number; snr: number };
}

export interface MeshTransport {
  /** Connect to a mesh radio device */
  connect(deviceId: string): Promise<void>;
  /** Disconnect from the current device */
  disconnect(): Promise<void>;
  /** Send a text message to the mesh network */
  sendText(text: string, channel?: number): Promise<void>;
  /** Subscribe to incoming messages. Returns unsubscribe function. */
  onMessage(cb: (msg: IncomingMessage) => void): () => void;
  /** Subscribe to connection status changes. Returns unsubscribe function. */
  onStatusChange(cb: (status: TransportStatus) => void): () => void;
  /** Get current connection status */
  getStatus(): TransportStatus;
  /** Get known peer nodes from the node database */
  getNodes(): SenderIdentity[];
}
