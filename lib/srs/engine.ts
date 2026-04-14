import type { ClientMood, PromptLevel, SessionTrial, Target } from "@/lib/types";

import { MOOD_MULTIPLIERS, PROMPT_LEVEL_INDEX } from "@/lib/srs/weights";

/**
 * Higher score = recommended sooner.
 * urgency = (1 / interval) * moodMultiplier * promptUrgency * overdueBonus
 */
export function computeUrgency(
  target: Target,
  mood: ClientMood,
  now: number
): number {
  const moodMult = MOOD_MULTIPLIERS[mood][target.category];
  const promptIdx = PROMPT_LEVEL_INDEX[target.lastPromptLevel];
  const promptUrgency = (promptIdx + 1) / 6;
  const overdueBonus = now > target.nextDue ? 1.5 : 1.0;

  return (
    (1 / Math.max(target.interval, 1)) *
    moodMult *
    promptUrgency *
    overdueBonus
  );
}

/**
 * Quality score maps trial outcome to SM-2 quality integer (0–5).
 * SM-2 requires q >= 3 to advance; below 3 resets interval.
 */
export const OUTCOME_QUALITY: Record<
  SessionTrial["outcome"],
  Record<PromptLevel, number>
> = {
  correct: {
    independent: 5,
    gestural: 4,
    verbal: 3,
    model: 3,
    partial_physical: 2,
    full_physical: 1,
  },
  incorrect: {
    independent: 2,
    gestural: 1,
    verbal: 1,
    model: 0,
    partial_physical: 0,
    full_physical: 0,
  },
  no_response: {
    independent: 1,
    gestural: 1,
    verbal: 0,
    model: 0,
    partial_physical: 0,
    full_physical: 0,
  },
};

const SESSION_MS = 24 * 60 * 60 * 1000;

export function updateTargetAfterTrial(
  target: Target,
  trial: SessionTrial,
  now: number = Date.now()
): Target {
  const q = OUTCOME_QUALITY[trial.outcome][trial.promptLevel];

  const newEF = Math.max(
    1.3,
    target.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  let newInterval: number;
  if (q < 3) {
    newInterval = 1;
  } else if (target.repetitions === 0) {
    newInterval = 1;
  } else if (target.repetitions === 1) {
    newInterval = 2;
  } else {
    newInterval = Math.round(target.interval * newEF);
  }

  return {
    ...target,
    easeFactor: newEF,
    interval: newInterval,
    repetitions: q >= 3 ? target.repetitions + 1 : 0,
    lastPromptLevel: trial.promptLevel,
    nextDue: now + newInterval * SESSION_MS,
    updatedAt: now,
  };
}
