import { create } from 'zustand';
import { savePreferences } from '../storage/preferences';

interface SettingsState {
  language: string;
  autoGps: boolean;
  autoTimestamp: boolean;
  notifySev0: boolean;
  notifySev1: boolean;
  notifySev2: boolean;
  notifySev3: boolean;

  setLanguage: (lang: string) => void;
  setAutoGps: (val: boolean) => void;
  setAutoTimestamp: (val: boolean) => void;
  setNotify: (severity: number, val: boolean) => void;
  hydrate: (prefs: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'en',
  autoGps: true,
  autoTimestamp: true,
  notifySev0: true,
  notifySev1: true,
  notifySev2: false,
  notifySev3: false,

  setLanguage: (lang) => {
    set({ language: lang });
    savePreferences({ language: lang });
  },

  setAutoGps: (val) => {
    set({ autoGps: val });
    savePreferences({ autoGps: val });
  },

  setAutoTimestamp: (val) => {
    set({ autoTimestamp: val });
    savePreferences({ autoTimestamp: val });
  },

  setNotify: (severity, val) => {
    const key = `notifySev${severity}` as keyof SettingsState;
    set({ [key]: val } as any);
    savePreferences({ [key]: val });
  },

  hydrate: (prefs) => {
    set(prefs);
  },
}));
