import type { ClientMood, PromptLevel } from "@/lib/types";

/** Lower index = more independent (better performance). */
export const PROMPT_LEVEL_INDEX: Record<PromptLevel, number> = {
  independent: 0,
  gestural: 1,
  verbal: 2,
  model: 3,
  partial_physical: 4,
  full_physical: 5,
};

export const MOOD_MULTIPLIERS: Record<
  ClientMood,
  { acquisition: number; maintenance: number }
> = {
  happy: { acquisition: 1.4, maintenance: 0.8 },
  neutral: { acquisition: 1.0, maintenance: 1.0 },
  frustrated: { acquisition: 0.5, maintenance: 1.6 },
};
