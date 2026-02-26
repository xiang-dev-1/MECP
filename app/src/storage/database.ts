import { Platform } from 'react-native';

let SQLite: any = null;
let db: any = null;

export interface StoredMessage {
  id: number;
  raw_string: string;
  severity: number | null;
  codes: string | null; // JSON array
  freetext: string | null;
  is_mecp: boolean;
  is_drill: boolean;
  direction: 'sent' | 'received' | 'draft';
  sender_node_id: string | null;
  sender_display_name: string | null;
  channel: string | null;
  timestamp_received: number;
  gps_lat: number | null;
  gps_lon: number | null;
  reference_tag: string | null;
  is_read: boolean;
  is_pinned: boolean;
  rssi: number | null;
  snr: number | null;
}

export interface OutboxEntry {
  id: number;
  raw_string: string;
  channel: number | null;
  severity: number | null;
  created_at: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export interface BeaconSession {
  id: number;
  original_codes: string;
  original_freetext: string | null;
  severity: number;
  is_drill: boolean;
  started_at: number;
  acknowledged_at: number | null;
  cancelled_at: number | null;
  ack_node_id: string | null;
  ack_display_name: string | null;
  interval_minutes: number;
  transmit_count: number;
  max_transmits: number | null;
  status: 'active' | 'completed';
}

export interface BeaconPosition {
  id: number;
  beacon_session_id: number;
  gps_lat: number;
  gps_lon: number;
  timestamp: number;
}

export interface ReceivedBeacon {
  id: number;
  sender_node_id: string;
  sender_display_name: string | null;
  first_seen: number;
  last_seen: number;
  last_codes: string;
  is_drill: boolean;
  status: 'active' | 'completed';
}

export interface ReceivedBeaconPosition {
  id: number;
  received_beacon_id: number;
  gps_lat: number;
  gps_lon: number;
  timestamp: number;
}

// ── In-memory fallback for web ──
const memStore: {
  messages: StoredMessage[];
  outbox: OutboxEntry[];
  beaconSessions: BeaconSession[];
  beaconPositions: BeaconPosition[];
  receivedBeacons: ReceivedBeacon[];
  receivedBeaconPositions: ReceivedBeaconPosition[];
} = {
  messages: [],
  outbox: [],
  beaconSessions: [],
  beaconPositions: [],
  receivedBeacons: [],
  receivedBeaconPositions: [],
};
let memNextId = 1;
let memOutboxId = 1;
let memBeaconSessionId = 1;
let memBeaconPositionId = 1;
let memReceivedBeaconId = 1;
let memReceivedBeaconPositionId = 1;

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

function getDb() {
  if (!isNative) return null;
  if (!db && SQLite) {
    db = SQLite.openDatabaseSync('mecp.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  if (!isNative) return; // in-memory on web

  try {
    SQLite = require('expo-sqlite');
  } catch {
    return; // graceful fallback
  }

  const database = getDb();
  if (!database) return;

  database.execSync(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_string TEXT NOT NULL,
      severity INTEGER,
      codes TEXT,
      freetext TEXT,
      is_mecp INTEGER DEFAULT 0,
      is_drill INTEGER DEFAULT 0,
      direction TEXT NOT NULL,
      sender_node_id TEXT,
      sender_display_name TEXT,
      channel TEXT,
      timestamp_received INTEGER NOT NULL,
      gps_lat REAL,
      gps_lon REAL,
      reference_tag TEXT,
      is_read INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      rssi INTEGER,
      snr REAL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      display_name TEXT,
      short_name TEXT,
      platform TEXT NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_string TEXT NOT NULL,
      channel INTEGER,
      severity INTEGER,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS beacon_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_codes TEXT NOT NULL,
      original_freetext TEXT,
      severity INTEGER NOT NULL,
      is_drill INTEGER DEFAULT 0,
      started_at INTEGER NOT NULL,
      acknowledged_at INTEGER,
      cancelled_at INTEGER,
      ack_node_id TEXT,
      ack_display_name TEXT,
      interval_minutes INTEGER DEFAULT 5,
      transmit_count INTEGER DEFAULT 0,
      max_transmits INTEGER,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS beacon_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beacon_session_id INTEGER NOT NULL,
      gps_lat REAL NOT NULL,
      gps_lon REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (beacon_session_id) REFERENCES beacon_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS received_beacons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_node_id TEXT NOT NULL,
      sender_display_name TEXT,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      last_codes TEXT NOT NULL,
      is_drill INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS received_beacon_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      received_beacon_id INTEGER NOT NULL,
      gps_lat REAL NOT NULL,
      gps_lon REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (received_beacon_id) REFERENCES received_beacons(id)
    );
  `);
}

export async function insertMessage(
  msg: Omit<StoredMessage, 'id'>
): Promise<number> {
  const database = getDb();
  if (!database) {
    const id = memNextId++;
    memStore.messages.unshift({ ...msg, id } as StoredMessage);
    return id;
  }

  const result = database.runSync(
    `INSERT INTO messages (
      raw_string, severity, codes, freetext, is_mecp, is_drill,
      direction, sender_node_id, sender_display_name, channel,
      timestamp_received, gps_lat, gps_lon, reference_tag,
      is_read, is_pinned, rssi, snr
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      msg.raw_string,
      msg.severity,
      msg.codes,
      msg.freetext,
      msg.is_mecp ? 1 : 0,
      msg.is_drill ? 1 : 0,
      msg.direction,
      msg.sender_node_id,
      msg.sender_display_name,
      msg.channel,
      msg.timestamp_received,
      msg.gps_lat,
      msg.gps_lon,
      msg.reference_tag,
      msg.is_read ? 1 : 0,
      msg.is_pinned ? 1 : 0,
      msg.rssi,
      msg.snr,
    ]
  );
  return result.lastInsertRowId;
}

export async function getMessages(
  limit: number = 100,
  offset: number = 0
): Promise<StoredMessage[]> {
  const database = getDb();
  if (!database) {
    return memStore.messages.slice(offset, offset + limit);
  }

  const rows = database.getAllSync(
    `SELECT * FROM messages ORDER BY timestamp_received DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  ) as StoredMessage[];
  return rows.map(normalizeMessage);
}

export async function getMessageById(
  id: number
): Promise<StoredMessage | null> {
  const database = getDb();
  if (!database) {
    return memStore.messages.find((m) => m.id === id) ?? null;
  }

  const row = database.getFirstSync(
    `SELECT * FROM messages WHERE id = ?`,
    [id]
  ) as StoredMessage | null;
  return row ? normalizeMessage(row) : null;
}

export async function markRead(id: number): Promise<void> {
  const database = getDb();
  if (!database) {
    const msg = memStore.messages.find((m) => m.id === id);
    if (msg) msg.is_read = true;
    return;
  }

  database.runSync(`UPDATE messages SET is_read = 1 WHERE id = ?`, [id]);
}

export async function insertOutbox(
  rawString: string,
  channel: number | null,
  severity: number | null
): Promise<number> {
  const database = getDb();
  if (!database) {
    const id = memOutboxId++;
    memStore.outbox.push({
      id,
      raw_string: rawString,
      channel,
      severity,
      created_at: Date.now(),
      status: 'pending',
    });
    return id;
  }

  const result = database.runSync(
    `INSERT INTO outbox (raw_string, channel, severity, created_at, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [rawString, channel, severity, Date.now()]
  );
  return result.lastInsertRowId;
}

export async function getPendingOutbox(): Promise<OutboxEntry[]> {
  const database = getDb();
  if (!database) {
    return memStore.outbox
      .filter((e) => e.status === 'pending')
      .sort((a, b) => (a.severity ?? 9) - (b.severity ?? 9) || a.created_at - b.created_at);
  }

  return database.getAllSync(
    `SELECT * FROM outbox WHERE status = 'pending'
     ORDER BY severity ASC, created_at ASC`
  ) as OutboxEntry[];
}

export async function updateOutboxStatus(
  id: number,
  status: OutboxEntry['status']
): Promise<void> {
  const database = getDb();
  if (!database) {
    const entry = memStore.outbox.find((e) => e.id === id);
    if (entry) entry.status = status;
    return;
  }

  database.runSync(
    `UPDATE outbox SET status = ? WHERE id = ?`,
    [status, id]
  );
}

function normalizeMessage(row: any): StoredMessage {
  return {
    ...row,
    is_mecp: Boolean(row.is_mecp),
    is_drill: Boolean(row.is_drill),
    is_read: Boolean(row.is_read),
    is_pinned: Boolean(row.is_pinned),
  };
}

function normalizeBeaconSession(row: any): BeaconSession {
  return { ...row, is_drill: Boolean(row.is_drill) };
}

function normalizeReceivedBeacon(row: any): ReceivedBeacon {
  return { ...row, is_drill: Boolean(row.is_drill) };
}

// ── Beacon Session CRUD ──

export async function insertBeaconSession(
  session: Omit<BeaconSession, 'id'>
): Promise<number> {
  const database = getDb();
  if (!database) {
    const id = memBeaconSessionId++;
    memStore.beaconSessions.push({ ...session, id });
    return id;
  }
  const result = database.runSync(
    `INSERT INTO beacon_sessions (
      original_codes, original_freetext, severity, is_drill,
      started_at, acknowledged_at, cancelled_at, ack_node_id, ack_display_name,
      interval_minutes, transmit_count, max_transmits, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.original_codes, session.original_freetext, session.severity,
      session.is_drill ? 1 : 0, session.started_at, session.acknowledged_at,
      session.cancelled_at, session.ack_node_id, session.ack_display_name,
      session.interval_minutes, session.transmit_count, session.max_transmits,
      session.status,
    ]
  );
  return result.lastInsertRowId;
}

export async function getActiveBeaconSession(): Promise<BeaconSession | null> {
  const database = getDb();
  if (!database) {
    return memStore.beaconSessions.find((s) => s.status === 'active') ?? null;
  }
  const row = database.getFirstSync(
    `SELECT * FROM beacon_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`
  );
  return row ? normalizeBeaconSession(row) : null;
}

export async function updateBeaconSession(
  id: number,
  updates: Partial<Pick<BeaconSession,
    'acknowledged_at' | 'cancelled_at' | 'ack_node_id' | 'ack_display_name' |
    'interval_minutes' | 'transmit_count' | 'status'
  >>
): Promise<void> {
  const database = getDb();
  if (!database) {
    const session = memStore.beaconSessions.find((s) => s.id === id);
    if (session) Object.assign(session, updates);
    return;
  }
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (sets.length === 0) return;
  vals.push(id);
  database.runSync(`UPDATE beacon_sessions SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function insertBeaconPosition(
  pos: Omit<BeaconPosition, 'id'>
): Promise<number> {
  const database = getDb();
  if (!database) {
    const id = memBeaconPositionId++;
    memStore.beaconPositions.push({ ...pos, id });
    return id;
  }
  const result = database.runSync(
    `INSERT INTO beacon_positions (beacon_session_id, gps_lat, gps_lon, timestamp)
     VALUES (?, ?, ?, ?)`,
    [pos.beacon_session_id, pos.gps_lat, pos.gps_lon, pos.timestamp]
  );
  return result.lastInsertRowId;
}

export async function getBeaconPositions(
  sessionId: number
): Promise<BeaconPosition[]> {
  const database = getDb();
  if (!database) {
    return memStore.beaconPositions.filter((p) => p.beacon_session_id === sessionId);
  }
  return database.getAllSync(
    `SELECT * FROM beacon_positions WHERE beacon_session_id = ? ORDER BY timestamp DESC`,
    [sessionId]
  ) as BeaconPosition[];
}

// ── Received Beacon CRUD ──

export async function insertReceivedBeacon(
  beacon: Omit<ReceivedBeacon, 'id'>
): Promise<number> {
  const database = getDb();
  if (!database) {
    const id = memReceivedBeaconId++;
    memStore.receivedBeacons.push({ ...beacon, id });
    return id;
  }
  const result = database.runSync(
    `INSERT INTO received_beacons (
      sender_node_id, sender_display_name, first_seen, last_seen,
      last_codes, is_drill, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      beacon.sender_node_id, beacon.sender_display_name,
      beacon.first_seen, beacon.last_seen, beacon.last_codes,
      beacon.is_drill ? 1 : 0, beacon.status,
    ]
  );
  return result.lastInsertRowId;
}

export async function getReceivedBeacons(
  statusFilter: 'active' | 'all' = 'active'
): Promise<ReceivedBeacon[]> {
  const database = getDb();
  if (!database) {
    const filtered = statusFilter === 'all'
      ? memStore.receivedBeacons
      : memStore.receivedBeacons.filter((b) => b.status === 'active');
    return filtered.sort((a, b) => b.last_seen - a.last_seen);
  }
  const where = statusFilter === 'all' ? '' : " WHERE status = 'active'";
  return (database.getAllSync(
    `SELECT * FROM received_beacons${where} ORDER BY last_seen DESC`
  ) as any[]).map(normalizeReceivedBeacon);
}

export async function updateReceivedBeacon(
  id: number,
  updates: Partial<Pick<ReceivedBeacon, 'last_seen' | 'last_codes' | 'sender_display_name' | 'status'>>
): Promise<void> {
  const database = getDb();
  if (!database) {
    const beacon = memStore.receivedBeacons.find((b) => b.id === id);
    if (beacon) Object.assign(beacon, updates);
    return;
  }
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (sets.length === 0) return;
  vals.push(id);
  database.runSync(`UPDATE received_beacons SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function getReceivedBeaconBySender(
  nodeId: string
): Promise<ReceivedBeacon | null> {
  const database = getDb();
  if (!database) {
    return memStore.receivedBeacons.find(
      (b) => b.sender_node_id === nodeId && b.status === 'active'
    ) ?? null;
  }
  const row = database.getFirstSync(
    `SELECT * FROM received_beacons WHERE sender_node_id = ? AND status = 'active' LIMIT 1`,
    [nodeId]
  );
  return row ? normalizeReceivedBeacon(row) : null;
}

export async function insertReceivedBeaconPosition(
  pos: Omit<ReceivedBeaconPosition, 'id'>
): Promise<number> {
  const database = getDb();
  if (!database) {
    const id = memReceivedBeaconPositionId++;
    memStore.receivedBeaconPositions.push({ ...pos, id });
    return id;
  }
  const result = database.runSync(
    `INSERT INTO received_beacon_positions (received_beacon_id, gps_lat, gps_lon, timestamp)
     VALUES (?, ?, ?, ?)`,
    [pos.received_beacon_id, pos.gps_lat, pos.gps_lon, pos.timestamp]
  );
  return result.lastInsertRowId;
}

export async function getReceivedBeaconPositions(
  beaconId: number
): Promise<ReceivedBeaconPosition[]> {
  const database = getDb();
  if (!database) {
    return memStore.receivedBeaconPositions.filter((p) => p.received_beacon_id === beaconId);
  }
  return database.getAllSync(
    `SELECT * FROM received_beacon_positions WHERE received_beacon_id = ? ORDER BY timestamp DESC`,
    [beaconId]
  ) as ReceivedBeaconPosition[];
}
