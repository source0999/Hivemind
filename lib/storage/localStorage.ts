import type { Session, Settings, Target } from "@/lib/types";

const KEYS = {
  targets: "hivemind:targets",
  sessions: "hivemind:sessions",
  settings: "hivemind:settings",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  cadencePerHour: 30,
  defaultMood: "neutral",
  acquisitionWeight: 0.6,
  maintenanceWeight: 0.4,
  sessionDurationMinutes: 60,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export const localStore = {
  getTargets(): Target[] {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(KEYS.targets);
    return raw ? (JSON.parse(raw) as Target[]) : [];
  },

  saveTargets(targets: Target[]): void {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.targets, JSON.stringify(targets));
  },

  getSessions(): Session[] {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(KEYS.sessions);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  },

  saveSession(session: Session): void {
    if (!isBrowser()) return;
    const sessions = localStore.getSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.push(session);
    localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  },

  getSettings(): Settings {
    if (!isBrowser()) return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? (JSON.parse(raw) as Settings) : { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: Settings): void {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  },

  /** Full snapshot for backup / export (localStorage only). */
  exportSnapshot(): {
    exportedAt: string;
    schemaVersion: number;
    targets: Target[];
    sessions: Session[];
    settings: Settings;
  } {
    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      targets: localStore.getTargets(),
      sessions: localStore.getSessions(),
      settings: localStore.getSettings(),
    };
  },
};
