import { create } from "zustand";

import { localStore } from "@/lib/storage/localStorage";
import type { ClientMood, Session, SessionTrial } from "@/lib/types";
import { generateId } from "@/lib/utils";

export type LogTrialInput = Omit<
  SessionTrial,
  "id" | "sessionId" | "timestamp"
> &
  Partial<Pick<SessionTrial, "id" | "timestamp">>;

export type SessionState = {
  activeSession: Session | null;
  startSession: (params: {
    clientMood: ClientMood;
    cadencePerHour: number;
    targetIds: string[];
  }) => void;
  endSession: () => void;
  logTrial: (trial: LogTrialInput) => void;
  updateMood: (mood: ClientMood) => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  startSession: ({ clientMood, cadencePerHour, targetIds }) => {
    const now = Date.now();
    const session: Session = {
      id: generateId(),
      startedAt: now,
      clientMood,
      trials: [],
      targetIds,
      cadencePerHour,
    };
    set({ activeSession: session });
    localStore.saveSession(session);
  },
  endSession: () => {
    const active = get().activeSession;
    if (!active) return;
    const ended: Session = { ...active, endedAt: Date.now() };
    set({ activeSession: null });
    localStore.saveSession(ended);
  },
  logTrial: (trialInput) => {
    const active = get().activeSession;
    if (!active) return;
    const trial: SessionTrial = {
      id: trialInput.id ?? generateId(),
      sessionId: active.id,
      timestamp: trialInput.timestamp ?? Date.now(),
      targetId: trialInput.targetId,
      outcome: trialInput.outcome,
      promptLevel: trialInput.promptLevel,
      notes: trialInput.notes,
    };
    const updated: Session = {
      ...active,
      trials: [...active.trials, trial],
    };
    set({ activeSession: updated });
    localStore.saveSession(updated);
  },
  updateMood: (mood) => {
    const active = get().activeSession;
    if (!active) return;
    const updated: Session = { ...active, clientMood: mood };
    set({ activeSession: updated });
    localStore.saveSession(updated);
  },
}));
