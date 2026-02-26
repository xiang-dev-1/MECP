import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useBeaconStore } from '../store/useBeaconStore';
import { getActiveBeaconSession } from '../storage/database';
import { encode, type Severity } from '@mecp/engine';
import { transportManager } from '../transport/TransportManager';
import { messageQueue } from '../storage/messageQueue';

const BEACON_TASK_NAME = 'mecp-beacon-task';

/** Register the background task (must be called at module level) */
TaskManager.defineTask(BEACON_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BeaconService] Task error:', error);
    return;
  }

  const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
  if (!locations || locations.length === 0) return;

  const session = await getActiveBeaconSession();
  if (!session) {
    await stopBeacon();
    return;
  }

  const loc = locations[locations.length - 1];
  const lat = loc.coords.latitude;
  const lon = loc.coords.longitude;

  // Build beacon message
  const codes: string[] = JSON.parse(session.original_codes);
  if (!codes.includes('B01')) codes.unshift('B01');
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const freetext = `${lat.toFixed(5)},${lon.toFixed(5)} @${hh}${mm}`;
  const result = encode(session.severity as Severity, codes, freetext);

  // Send or queue
  const status = transportManager.getStatus();
  if (status === 'connected') {
    try {
      await transportManager.send(result.message, null);
    } catch {
      await messageQueue.enqueue(result.message, null, session.severity);
    }
  } else {
    await messageQueue.enqueue(result.message, null, session.severity);
  }

  // Record position + check auto-stop
  await useBeaconStore.getState().recordTransmission(lat, lon);

  // Recalculate interval — re-register if changed
  const updatedSession = await getActiveBeaconSession();
  if (!updatedSession) {
    await stopBeacon();
    return;
  }

  // interval change requires re-registration
  if (updatedSession.interval_minutes !== session.interval_minutes) {
    await stopBeacon();
    await startBeaconUpdates(updatedSession.interval_minutes);
  }
});

async function startBeaconUpdates(intervalMinutes: number): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[BeaconService] Location permission not granted');
    return;
  }

  // Request background permission for foreground service
  const bgStatus = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus.status !== 'granted') {
    console.warn('[BeaconService] Background location permission not granted');
    // Fall back to foreground-only
  }

  await Location.startLocationUpdatesAsync(BEACON_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: intervalMinutes * 60 * 1000,
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: 'MECP Distress Beacon Active',
      notificationBody: `Transmitting position every ${intervalMinutes} minutes`,
      notificationColor: '#dc2626',
    },
    showsBackgroundLocationIndicator: true,
  });
}

export async function startBeacon(): Promise<void> {
  const session = await getActiveBeaconSession();
  if (!session) return;
  await startBeaconUpdates(session.interval_minutes);
}

export async function stopBeacon(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BEACON_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BEACON_TASK_NAME);
  }
}

export async function isBeaconRunning(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BEACON_TASK_NAME);
}
