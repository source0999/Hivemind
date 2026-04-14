export type PromptLevel =
  | "independent"
  | "gestural"
  | "verbal"
  | "model"
  | "partial_physical"
  | "full_physical";

export type TargetCategory = "acquisition" | "maintenance";

export type TargetDomain =
  | "communication"
  | "social"
  | "adaptive"
  | "motor"
  | "academic"
  | "behavior_reduction"
  | "other";

export interface Target {
  id: string;
  label: string;
  domain: TargetDomain;
  category: TargetCategory;
  masteryStatus: "in_progress" | "mastered" | "on_hold";

  easeFactor: number;
  interval: number;
  repetitions: number;
  nextDue: number;
  lastPromptLevel: PromptLevel;

  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface SessionTrial {
  id: string;
  targetId: string;
  sessionId: string;
  timestamp: number;
  outcome: "correct" | "incorrect" | "no_response";
  promptLevel: PromptLevel;
  notes?: string;
}

export type ClientMood = "happy" | "neutral" | "frustrated";

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  clientMood: ClientMood;
  trials: SessionTrial[];
  targetIds: string[];
  cadencePerHour: number;
}

export interface Settings {
  cadencePerHour: number;
  defaultMood: ClientMood;
  acquisitionWeight: number;
  maintenanceWeight: number;
  sessionDurationMinutes: number;
}
