import { Platform } from 'react-native';

const PREFS_KEY = '@mecp_preferences';

export interface Preferences {
  language: string;
  autoGps: boolean;
  autoTimestamp: boolean;
  notifySev0: boolean;
  notifySev1: boolean;
  notifySev2: boolean;
  notifySev3: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en',
  autoGps: true,
  autoTimestamp: true,
  notifySev0: true,
  notifySev1: true,
  notifySev2: false,
  notifySev3: false,
};

function getStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, val: string) => {
        localStorage.setItem(key, val);
        return Promise.resolve();
      },
    };
  }
  // Lazy require to avoid crash on web
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    const raw = await getStorage().getItem(PREFS_KEY);
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_PREFERENCES;
}

export async function savePreferences(prefs: Partial<Preferences>): Promise<void> {
  try {
    const current = await loadPreferences();
    const updated = { ...current, ...prefs };
    await getStorage().setItem(PREFS_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail — preferences are not critical
  }
}
