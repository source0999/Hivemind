import { create } from "zustand";

import { localStore } from "@/lib/storage/localStorage";
import { categoryFromMastery } from "@/lib/targetCategory";
import type { Target } from "@/lib/types";
import { generateId } from "@/lib/utils";

export type NewTargetInput = Omit<
  Target,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "easeFactor"
  | "interval"
  | "repetitions"
  | "nextDue"
>;

export type TargetsState = {
  targets: Target[];
  loadTargets: () => void;
  addTarget: (input: NewTargetInput) => void;
  updateTarget: (id: string, patch: Partial<Target>) => void;
  deleteTarget: (id: string) => void;
};

export const useTargetsStore = create<TargetsState>((set) => ({
  targets: [],
  loadTargets: () => {
    set({ targets: localStore.getTargets() });
  },
  addTarget: (input) => {
    const now = Date.now();
    const category = categoryFromMastery(input.masteryStatus);
    const target: Target = {
      ...input,
      category,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextDue: now,
      lastPromptLevel: input.lastPromptLevel ?? "full_physical",
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const next = [...state.targets, target];
      localStore.saveTargets(next);
      return { targets: next };
    });
  },
  updateTarget: (id, patch) => {
    set((state) => {
      const next = state.targets.map((t) => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch, updatedAt: Date.now() };
        if (patch.masteryStatus !== undefined) {
          merged.category = categoryFromMastery(merged.masteryStatus);
        }
        return merged;
      });
      localStore.saveTargets(next);
      return { targets: next };
    });
  },
  deleteTarget: (id) => {
    set((state) => {
      const next = state.targets.filter((t) => t.id !== id);
      localStore.saveTargets(next);
      return { targets: next };
    });
  },
}));
