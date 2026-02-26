import { create } from 'zustand';
import {
  insertBeaconSession,
  getActiveBeaconSession,
  updateBeaconSession,
  insertBeaconPosition,
  getBeaconPositions,
  insertReceivedBeacon,
  getReceivedBeacons,
  updateReceivedBeacon,
  getReceivedBeaconBySender,
  insertReceivedBeaconPosition,
  getReceivedBeaconPositions,
  type BeaconSession,
  type BeaconPosition,
  type ReceivedBeacon,
  type ReceivedBeaconPosition,
} from '../storage/database';

type AckState = 'idle' | 'waiting' | 'expired' | 'acknowledged';

interface BeaconState {
  // ── Outgoing beacon ──
  activeSession: BeaconSession | null;
  positions: BeaconPosition[];
  ackState: AckState;
  ackTimerId: ReturnType<typeof setTimeout> | null;
  ackNodeId: string | null;
  ackDisplayName: string | null;

  // ── Received beacons ──
  receivedBeacons: ReceivedBeacon[];
  receivedPositions: Record<number, ReceivedBeaconPosition[]>;

  // ── ACK loop ──
  startAckLoop: (sentAt: number) => void;
  handleAckReceived: (nodeId: string, name: string | null) => void;
  ackTimerExpired: () => void;
  clearAckLoop: () => void;

  // ── Outgoing beacon ──
  activateBeacon: (
    codes: string[],
    freetext: string | null,
    severity: number,
    isDrill: boolean
  ) => Promise<number>;
  cancelBeacon: () => Promise<void>;
  handleBeaconAck: (nodeId: string, name: string | null) => Promise<void>;
  recordTransmission: (lat: number, lon: number) => Promise<void>;
  loadActiveSession: () => Promise<void>;
  loadPositions: (sessionId: number) => Promise<void>;

  // ── Received beacons ──
  processIncomingBeacon: (
    senderNodeId: string,
    senderName: string | null,
    codes: string,
    isDrill: boolean,
    lat: number | null,
    lon: number | null
  ) => Promise<void>;
  processBeaconCancel: (nodeId: string) => Promise<void>;
  loadReceivedBeacons: () => Promise<void>;
  loadReceivedPositions: (beaconId: number) => Promise<void>;
  acknowledgeBeacon: (beaconId: number) => void;
}

/** Calculate beacon interval based on elapsed time and ack status */
function calculateInterval(startedAt: number, isAcked: boolean): number {
  if (isAcked) return 15;
  const elapsed = Date.now() - startedAt;
  const hours = elapsed / (1000 * 60 * 60);
  if (hours < 6) return 5;
  if (hours < 24) return 15;
  return 30;
}

const ACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const useBeaconStore = create<BeaconState>((set, get) => ({
  activeSession: null,
  positions: [],
  ackState: 'idle',
  ackTimerId: null,
  ackNodeId: null,
  ackDisplayName: null,
  receivedBeacons: [],
  receivedPositions: {},

  // ── ACK Loop ──

  startAckLoop: (sentAt) => {
    const prev = get().ackTimerId;
    if (prev) clearTimeout(prev);
    const timerId = setTimeout(() => {
      get().ackTimerExpired();
    }, ACK_TIMEOUT_MS);
    set({ ackState: 'waiting', ackTimerId: timerId, ackNodeId: null, ackDisplayName: null });
  },

  handleAckReceived: (nodeId, name) => {
    const timerId = get().ackTimerId;
    if (timerId) clearTimeout(timerId);
    set({
      ackState: 'acknowledged',
      ackTimerId: null,
      ackNodeId: nodeId,
      ackDisplayName: name,
    });
  },

  ackTimerExpired: () => {
    set({ ackState: 'expired', ackTimerId: null });
  },

  clearAckLoop: () => {
    const timerId = get().ackTimerId;
    if (timerId) clearTimeout(timerId);
    set({ ackState: 'idle', ackTimerId: null, ackNodeId: null, ackDisplayName: null });
  },

  // ── Outgoing Beacon ──

  activateBeacon: async (codes, freetext, severity, isDrill) => {
    const session: Omit<BeaconSession, 'id'> = {
      original_codes: JSON.stringify(codes),
      original_freetext: freetext,
      severity,
      is_drill: isDrill,
      started_at: Date.now(),
      acknowledged_at: null,
      cancelled_at: null,
      ack_node_id: null,
      ack_display_name: null,
      interval_minutes: 5,
      transmit_count: 0,
      max_transmits: isDrill ? 3 : null,
      status: 'active',
    };
    const id = await insertBeaconSession(session);
    const saved = { ...session, id };
    set({ activeSession: saved, positions: [] });
    return id;
  },

  cancelBeacon: async () => {
    const session = get().activeSession;
    if (!session) return;
    await updateBeaconSession(session.id, {
      status: 'completed',
      cancelled_at: Date.now(),
    });
    get().clearAckLoop();
    set({ activeSession: null, positions: [] });
  },

  handleBeaconAck: async (nodeId, name) => {
    const session = get().activeSession;
    if (!session) return;
    const newInterval = 15;
    await updateBeaconSession(session.id, {
      acknowledged_at: Date.now(),
      ack_node_id: nodeId,
      ack_display_name: name,
      interval_minutes: newInterval,
    });
    set({
      activeSession: {
        ...session,
        acknowledged_at: Date.now(),
        ack_node_id: nodeId,
        ack_display_name: name,
        interval_minutes: newInterval,
      },
    });
    get().handleAckReceived(nodeId, name);
  },

  recordTransmission: async (lat, lon) => {
    const session = get().activeSession;
    if (!session) return;
    const now = Date.now();
    await insertBeaconPosition({
      beacon_session_id: session.id,
      gps_lat: lat,
      gps_lon: lon,
      timestamp: now,
    });
    const newCount = session.transmit_count + 1;
    const newInterval = calculateInterval(session.started_at, session.acknowledged_at !== null);
    await updateBeaconSession(session.id, {
      transmit_count: newCount,
      interval_minutes: newInterval,
    });

    // Auto-stop drill after max transmits
    if (session.max_transmits && newCount >= session.max_transmits) {
      await updateBeaconSession(session.id, { status: 'completed' });
      get().clearAckLoop();
      set({ activeSession: null, positions: [] });
      return;
    }

    set({
      activeSession: { ...session, transmit_count: newCount, interval_minutes: newInterval },
    });
    await get().loadPositions(session.id);
  },

  loadActiveSession: async () => {
    const session = await getActiveBeaconSession();
    set({ activeSession: session });
    if (session) {
      const positions = await getBeaconPositions(session.id);
      set({ positions });
    }
  },

  loadPositions: async (sessionId) => {
    const positions = await getBeaconPositions(sessionId);
    set({ positions });
  },

  // ── Received Beacons ──

  processIncomingBeacon: async (senderNodeId, senderName, codes, isDrill, lat, lon) => {
    const now = Date.now();
    let existing = await getReceivedBeaconBySender(senderNodeId);
    if (existing) {
      await updateReceivedBeacon(existing.id, {
        last_seen: now,
        last_codes: codes,
        sender_display_name: senderName ?? existing.sender_display_name,
      });
    } else {
      const id = await insertReceivedBeacon({
        sender_node_id: senderNodeId,
        sender_display_name: senderName,
        first_seen: now,
        last_seen: now,
        last_codes: codes,
        is_drill: isDrill,
        status: 'active',
      });
      existing = { id, sender_node_id: senderNodeId, sender_display_name: senderName, first_seen: now, last_seen: now, last_codes: codes, is_drill: isDrill, status: 'active' };
    }
    if (lat !== null && lon !== null) {
      await insertReceivedBeaconPosition({
        received_beacon_id: existing.id,
        gps_lat: lat,
        gps_lon: lon,
        timestamp: now,
      });
    }
    await get().loadReceivedBeacons();
  },

  processBeaconCancel: async (nodeId) => {
    const existing = await getReceivedBeaconBySender(nodeId);
    if (existing) {
      await updateReceivedBeacon(existing.id, { status: 'completed' });
      await get().loadReceivedBeacons();
    }
  },

  loadReceivedBeacons: async () => {
    const beacons = await getReceivedBeacons('active');
    set({ receivedBeacons: beacons });
  },

  loadReceivedPositions: async (beaconId) => {
    const positions = await getReceivedBeaconPositions(beaconId);
    set((state) => ({
      receivedPositions: { ...state.receivedPositions, [beaconId]: positions },
    }));
  },

  acknowledgeBeacon: (_beaconId) => {
    // Placeholder — the actual B02 send is handled by the transport layer
    // This is called from BeaconCard to trigger the compose flow
  },
}));
