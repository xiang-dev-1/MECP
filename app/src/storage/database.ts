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

// ── In-memory fallback for web ──
const memStore: { messages: StoredMessage[]; outbox: OutboxEntry[] } = {
  messages: [],
  outbox: [],
};
let memNextId = 1;
let memOutboxId = 1;

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
