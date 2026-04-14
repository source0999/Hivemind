import { create } from "zustand";

import { DEFAULT_SETTINGS, localStore } from "@/lib/storage/localStorage";
import type { Settings } from "@/lib/types";

export type SettingsState = {
  settings: Settings;
  loadSettings: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loadSettings: () => {
    set({ settings: localStore.getSettings() });
  },
  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    localStore.saveSettings(next);
  },
}));
