import { describe, expect, it } from "vitest";

import { computeUrgency, updateTargetAfterTrial } from "@/lib/srs/engine";
import { MOOD_MULTIPLIERS } from "@/lib/srs/weights";
import { buildQueue } from "@/lib/srs/queue";
import type { SessionTrial, Settings, Target, TargetCategory } from "@/lib/types";

const BASE_TS = 1_700_000_000_000;

function makeTarget(overrides: Partial<Target> & { category: TargetCategory }): Target {
  return {
    id: "t1",
    label: "Test",
    domain: "communication",
    category: overrides.category,
    masteryStatus: overrides.category === "maintenance" ? "mastered" : "in_progress",
    easeFactor: 2.5,
    interval: 2,
    repetitions: 2,
    nextDue: BASE_TS,
    lastPromptLevel: "gestural",
    createdAt: BASE_TS,
    updatedAt: BASE_TS,
    ...overrides,
  };
}

function makeTrial(
  overrides: Partial<SessionTrial> & Pick<SessionTrial, "outcome" | "promptLevel">
): SessionTrial {
  return {
    id: "tr1",
    targetId: "t1",
    sessionId: "s1",
    timestamp: BASE_TS,
    ...overrides,
  };
}

const defaultSettings: Settings = {
  cadencePerHour: 30,
  defaultMood: "neutral",
  acquisitionWeight: 0.6,
  maintenanceWeight: 0.4,
  sessionDurationMinutes: 60,
};

describe("computeUrgency", () => {
  it("uses (1/interval) * moodMultiplier * promptUrgency * overdueBonus", () => {
    const target = makeTarget({ category: "acquisition", interval: 2, lastPromptLevel: "gestural" });
    const now = BASE_TS;
    const promptIdx = 1;
    const promptUrgency = (promptIdx + 1) / 6;
    const moodMult = MOOD_MULTIPLIERS.neutral.acquisition;
    const expected =
      (1 / 2) * moodMult * promptUrgency * 1.0;

    expect(computeUrgency(target, "neutral", now)).toBeCloseTo(expected, 10);
  });

  it("applies overdue bonus when now > nextDue", () => {
    const target = makeTarget({
      category: "acquisition",
      nextDue: BASE_TS + 10_000,
    });
    const uOnTime = computeUrgency(target, "neutral", BASE_TS);
    const uOverdue = computeUrgency(target, "neutral", BASE_TS + 20_000);
    expect(uOnTime).toBeGreaterThan(0);
    expect(uOverdue / uOnTime).toBeCloseTo(1.5, 10);
  });

  it("boosts maintenance relative to acquisition when mood is frustrated", () => {
    const base = {
      interval: 3,
      lastPromptLevel: "verbal" as const,
      nextDue: BASE_TS + 10_000,
    };
    const acq = makeTarget({ category: "acquisition", ...base });
    const maint = makeTarget({ category: "maintenance", ...base });
    const now = BASE_TS;

    const uAcq = computeUrgency(acq, "frustrated", now);
    const uMaint = computeUrgency(maint, "frustrated", now);

    expect(uMaint).toBeGreaterThan(uAcq);

    const ratioFrustrated = uMaint / uAcq;
    const ratioNeutral =
      computeUrgency(maint, "neutral", now) / computeUrgency(acq, "neutral", now);

    const expectedBoost =
      MOOD_MULTIPLIERS.frustrated.maintenance /
      MOOD_MULTIPLIERS.frustrated.acquisition;
    expect(ratioFrustrated).toBeCloseTo(expectedBoost, 10);
    expect(ratioFrustrated).toBeGreaterThan(ratioNeutral);
  });
});

describe("updateTargetAfterTrial (SM-2 variant)", () => {
  it("increases interval and easeFactor after independent + correct", () => {
    const target = makeTarget({
      category: "acquisition",
      interval: 4,
      repetitions: 2,
      easeFactor: 2.5,
      lastPromptLevel: "full_physical",
    });
    const trial = makeTrial({ outcome: "correct", promptLevel: "independent" });
    const now = BASE_TS + 1000;
    const next = updateTargetAfterTrial(target, trial, now);

    expect(next.interval).toBeGreaterThan(target.interval);
    expect(next.easeFactor).toBeGreaterThanOrEqual(target.easeFactor);
    expect(next.repetitions).toBe(target.repetitions + 1);
    expect(next.lastPromptLevel).toBe("independent");
  });

  it("resets interval to 1 and repetitions to 0 on full_physical incorrect", () => {
    const target = makeTarget({
      category: "acquisition",
      interval: 5,
      repetitions: 3,
      easeFactor: 2.2,
    });
    const trial = makeTrial({ outcome: "incorrect", promptLevel: "full_physical" });
    const now = BASE_TS;
    const next = updateTargetAfterTrial(target, trial, now);

    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(0);
  });
});

describe("buildQueue", () => {
  it("interleaves maintenance before acquisition in each pair", () => {
    const acq = makeTarget({
      id: "a1",
      category: "acquisition",
      interval: 1,
      lastPromptLevel: "independent",
    });
    const maint = makeTarget({
      id: "m1",
      category: "maintenance",
      interval: 1,
      lastPromptLevel: "independent",
    });
    const queue = buildQueue([acq, maint], "neutral", BASE_TS, defaultSettings);
    expect(queue.length).toBeGreaterThanOrEqual(2);
    expect(queue[0].category).toBe("maintenance");
    expect(queue[1].category).toBe("acquisition");
  });

  it("with frustrated mood, first slot is maintenance when both types exist", () => {
    const acq = makeTarget({
      id: "a1",
      category: "acquisition",
      interval: 1,
      repetitions: 0,
      lastPromptLevel: "independent",
      nextDue: BASE_TS - 1,
    });
    const maint = makeTarget({
      id: "m1",
      category: "maintenance",
      interval: 10,
      repetitions: 0,
      lastPromptLevel: "full_physical",
      nextDue: BASE_TS + 1_000_000,
    });
    const queue = buildQueue([acq, maint], "frustrated", BASE_TS, defaultSettings);
    expect(queue[0]?.category).toBe("maintenance");
  });
});
