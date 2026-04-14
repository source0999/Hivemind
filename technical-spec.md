# Hivemind — Technical Specification

**Version:** 1.0.0-draft  
**Status:** In Progress  
**Last Updated:** 2026-04-14  

---

## Table of Contents

1. [Data Models](#1-data-models)
2. [SRS Algorithm Spec](#2-srs-algorithm-spec)
3. [Storage Architecture](#3-storage-architecture)
4. [Component Architecture](#4-component-architecture)
5. [5-Phase Coding Plan](#5-phase-coding-plan)

---

## 1. Data Models

All core types live in `lib/types.ts`. These are the canonical shapes used across the store, engine, and UI.

### `Target`

Represents a single goal/target from a client's BIP.

```typescript
export type PromptLevel =
  | 'independent'
  | 'gestural'
  | 'verbal'
  | 'model'
  | 'partial_physical'
  | 'full_physical';

export type TargetCategory = 'acquisition' | 'maintenance';

export type TargetDomain =
  | 'communication'
  | 'social'
  | 'adaptive'
  | 'motor'
  | 'academic'
  | 'behavior_reduction'
  | 'other';

export interface Target {
  id: string;                        // UUID
  label: string;                     // e.g. "Identifies colors: red, blue, green"
  domain: TargetDomain;
  category: TargetCategory;          // Derived from masteryStatus; can be overridden
  masteryStatus: 'in_progress' | 'mastered' | 'on_hold';
  
  // SRS fields
  easeFactor: number;                // Default: 2.5 (SM-2 standard)
  interval: number;                  // Sessions until next review (starts at 1)
  repetitions: number;               // Total correct trials across all sessions
  nextDue: number;                   // Unix timestamp of next scheduled session
  lastPromptLevel: PromptLevel;      // Most recent prompt level logged
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  notes?: string;
}
```

### `SessionTrial`

A single logged data point during a session.

```typescript
export interface SessionTrial {
  id: string;
  targetId: string;
  sessionId: string;
  timestamp: number;
  outcome: 'correct' | 'incorrect' | 'no_response';
  promptLevel: PromptLevel;
  notes?: string;
}
```

### `Session`

A complete therapy session record.

```typescript
export type ClientMood = 'happy' | 'neutral' | 'frustrated';

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  clientMood: ClientMood;            // Set at session start; can update mid-session
  trials: SessionTrial[];
  targetIds: string[];               // All targets active during this session
  cadencePerHour: number;            // e.g. 30
}
```

### `Settings`

```typescript
export interface Settings {
  cadencePerHour: number;            // Default: 30
  defaultMood: ClientMood;
  acquisitionWeight: number;         // % of session targets that are acquisition (0–1). Default: 0.6
  maintenanceWeight: number;         // % maintenance. Default: 0.4
  sessionDurationMinutes: number;    // Default: 60
}
```

---

## 2. SRS Algorithm Spec

The engine lives in `lib/srs/`. It is a pure TypeScript module with no React dependencies — fully unit-testable.

### 2.1 Prompt Level Index

Prompt levels are mapped to a numeric index for mathematical weighting. Lower = more independent = better performance.

```typescript
// lib/srs/weights.ts
export const PROMPT_LEVEL_INDEX: Record<PromptLevel, number> = {
  independent:      0,
  gestural:         1,
  verbal:           2,
  model:            3,
  partial_physical: 4,
  full_physical:    5,
};
```

### 2.2 Mood Multipliers

Applied to a target's computed urgency score to shift the overall queue composition.

```typescript
// lib/srs/weights.ts
export const MOOD_MULTIPLIERS: Record<ClientMood, { acquisition: number; maintenance: number }> = {
  happy:      { acquisition: 1.4, maintenance: 0.8 },
  neutral:    { acquisition: 1.0, maintenance: 1.0 },
  frustrated: { acquisition: 0.5, maintenance: 1.6 },
};
```

### 2.3 Urgency Score Formula

This is the value used to sort the priority queue before every target recommendation.

```typescript
/**
 * Computes a target's urgency score.
 * Higher score = recommended sooner.
 *
 * urgency = (1 / interval) * moodMultiplier * promptUrgency * overdueBonus
 *
 * - interval:       SRS interval in sessions. Short interval = higher urgency.
 * - moodMultiplier: From MOOD_MULTIPLIERS, based on target category + current mood.
 * - promptUrgency:  (promptIndex + 1) / 6. More prompting = needs more reps.
 * - overdueBonus:   If nextDue is in the past, multiply by 1.5.
 */
export function computeUrgency(target: Target, mood: ClientMood, now: number): number {
  const moodMult = MOOD_MULTIPLIERS[mood][target.category];
  const promptIdx = PROMPT_LEVEL_INDEX[target.lastPromptLevel];
  const promptUrgency = (promptIdx + 1) / 6;
  const overdue = now > target.nextDue ? 1.5 : 1.0;

  return (1 / Math.max(target.interval, 1)) * moodMult * promptUrgency * overdue;
}
```

### 2.4 Post-Trial Update (SM-2 Variant)

After each trial outcome, the target's SRS values are updated.

```typescript
/**
 * Quality score maps trial outcome to SM-2 quality integer (0–5).
 * SM-2 requires q >= 3 to advance; below 3 resets interval.
 */
const OUTCOME_QUALITY: Record<SessionTrial['outcome'], Record<PromptLevel, number>> = {
  correct: {
    independent:      5,
    gestural:         4,
    verbal:           3,
    model:            3,
    partial_physical: 2,
    full_physical:    1,
  },
  incorrect: {
    independent:      2, gestural: 1, verbal: 1,
    model: 0, partial_physical: 0, full_physical: 0,
  },
  no_response: {
    independent:      1, gestural: 1, verbal: 0,
    model: 0, partial_physical: 0, full_physical: 0,
  },
};

export function updateTargetAfterTrial(target: Target, trial: SessionTrial): Target {
  const q = OUTCOME_QUALITY[trial.outcome][trial.promptLevel];

  // SM-2 ease factor update
  const newEF = Math.max(
    1.3,
    target.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  // Interval update
  let newInterval: number;
  if (q < 3) {
    newInterval = 1; // Reset: retry next session
  } else if (target.repetitions === 0) {
    newInterval = 1;
  } else if (target.repetitions === 1) {
    newInterval = 2;
  } else {
    newInterval = Math.round(target.interval * newEF);
  }

  const SESSION_MS = 24 * 60 * 60 * 1000; // Treat 1 session = 1 day for scheduling

  return {
    ...target,
    easeFactor: newEF,
    interval: newInterval,
    repetitions: q >= 3 ? target.repetitions + 1 : 0,
    lastPromptLevel: trial.promptLevel,
    nextDue: Date.now() + newInterval * SESSION_MS,
    updatedAt: Date.now(),
  };
}
```

### 2.5 Queue Engine

```typescript
// lib/srs/queue.ts
export function buildQueue(
  targets: Target[],
  mood: ClientMood,
  now: number,
  settings: Settings
): Target[] {
  // 1. Filter out on_hold targets
  const active = targets.filter(t => t.masteryStatus !== 'on_hold');

  // 2. Score each target
  const scored = active.map(t => ({
    target: t,
    urgency: computeUrgency(t, mood, now),
  }));

  // 3. Sort descending by urgency
  scored.sort((a, b) => b.urgency - a.urgency);

  // 4. Enforce acquisition/maintenance ratio from settings
  const totalSlots = Math.ceil(settings.cadencePerHour / 4); // 15-min window
  const acqSlots = Math.round(totalSlots * settings.acquisitionWeight);
  const mntSlots = totalSlots - acqSlots;

  const acquisition = scored.filter(s => s.target.category === 'acquisition').slice(0, acqSlots);
  const maintenance = scored.filter(s => s.target.category === 'maintenance').slice(0, mntSlots);

  // 5. Interleave: maintenance → acquisition → maintenance → acquisition...
  const queue: Target[] = [];
  const maxLen = Math.max(acquisition.length, maintenance.length);
  for (let i = 0; i < maxLen; i++) {
    if (maintenance[i]) queue.push(maintenance[i].target);
    if (acquisition[i]) queue.push(acquisition[i].target);
  }

  return queue;
}
```

---

## 3. Storage Architecture

### 3.1 LocalStorage Adapter

All reads/writes go through a typed adapter so the storage layer is swappable.

```typescript
// lib/storage/localStorage.ts
const KEYS = {
  targets:  'hivemind:targets',
  sessions: 'hivemind:sessions',
  settings: 'hivemind:settings',
} as const;

export const localStore = {
  getTargets: (): Target[] => {
    const raw = localStorage.getItem(KEYS.targets);
    return raw ? JSON.parse(raw) : [];
  },
  saveTargets: (targets: Target[]) => {
    localStorage.setItem(KEYS.targets, JSON.stringify(targets));
  },
  getSessions: (): Session[] => {
    const raw = localStorage.getItem(KEYS.sessions);
    return raw ? JSON.parse(raw) : [];
  },
  saveSession: (session: Session) => {
    const sessions = localStore.getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.push(session);
    localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  },
  getSettings: (): Settings => {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  },
  saveSettings: (settings: Settings) => {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  },
};
```

### 3.2 Prisma Schema (PostgreSQL Ready)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Target {
  id              String   @id @default(uuid())
  label           String
  domain          String
  category        String
  masteryStatus   String
  easeFactor      Float    @default(2.5)
  interval        Int      @default(1)
  repetitions     Int      @default(0)
  nextDue         DateTime @default(now())
  lastPromptLevel String   @default("full_physical")
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  trials          SessionTrial[]
}

model Session {
  id                    String   @id @default(uuid())
  startedAt             DateTime @default(now())
  endedAt               DateTime?
  clientMood            String
  cadencePerHour        Int
  trials                SessionTrial[]
}

model SessionTrial {
  id          String   @id @default(uuid())
  targetId    String
  sessionId   String
  timestamp   DateTime @default(now())
  outcome     String
  promptLevel String
  notes       String?
  target      Target   @relation(fields: [targetId], references: [id])
  session     Session  @relation(fields: [sessionId], references: [id])
}
```

---

## 4. Component Architecture

### Key Component Contracts

#### `<TargetCard />`

```typescript
interface TargetCardProps {
  target: Target;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showSRSInfo?: boolean; // Dev mode: shows interval, easeFactor
}
```

#### `<MoodSelector />`

```typescript
interface MoodSelectorProps {
  value: ClientMood;
  onChange: (mood: ClientMood) => void;
  disabled?: boolean;
}
```

#### `<TrialLogger />`

```typescript
interface TrialLoggerProps {
  target: Target;
  onLog: (outcome: SessionTrial['outcome'], promptLevel: PromptLevel) => void;
  onSkip: () => void;
}
```

#### `<SessionRunner />`

Stateful component that owns the cadence timer and queue state.

```typescript
interface SessionRunnerProps {
  session: Session;
  queue: Target[];
  onTrialLogged: (trial: SessionTrial) => void;
  onMoodChange: (mood: ClientMood) => void;
  onSessionEnd: () => void;
}
```

---

## 5. Phase Coding Plan

Each phase is designed to be a self-contained prompt for Cursor. Complete and verify each phase before starting the next. Each phase ends with a clear deliverable you can test in the browser.

---

### Phase 1 — Project Scaffold, Types & Storage Layer

**Goal:** Get a clean Next.js project with all foundational types, the storage adapter, and Zustand stores wired up. No UI yet — just the data layer.

**Cursor Prompt:**

> Create a Next.js 14 project (App Router, TypeScript, Tailwind) called `hivemind`.
>
> 1. Create `lib/types.ts` with the following types: `PromptLevel`, `TargetCategory`, `TargetDomain`, `Target`, `SessionTrial`, `Session`, `ClientMood`, `Settings`. Use the exact shapes from the spec.
>
> 2. Create `lib/storage/localStorage.ts` with a `localStore` object exposing: `getTargets`, `saveTargets`, `getSessions`, `saveSession`, `getSettings`, `saveSettings`. Use the keys `hivemind:targets`, `hivemind:sessions`, `hivemind:settings`.
>
> 3. Create three Zustand stores:
>    - `store/targets.ts` — state: `targets: Target[]`; actions: `addTarget`, `updateTarget`, `deleteTarget`, `loadTargets`. On load, hydrate from `localStore.getTargets()`. On mutation, persist to `localStore.saveTargets()`.
>    - `store/session.ts` — state: `activeSession: Session | null`; actions: `startSession`, `endSession`, `logTrial`, `updateMood`. Persist to `localStore.saveSession()`.
>    - `store/settings.ts` — state: `settings: Settings`; actions: `updateSettings`. Hydrate and persist from `localStore.getSettings()`.
>
> 4. Create `prisma/schema.prisma` with `Target`, `Session`, and `SessionTrial` models ready for PostgreSQL.
>
> 5. Add a `lib/utils.ts` with a `generateId()` helper using `crypto.randomUUID()`.
>
> Deliverable: `npm run build` passes with no type errors.

---

### Phase 2 — Target Management UI

**Goal:** RBTs can add, view, edit, and delete targets. Full CRUD UI backed by the Zustand store.

**Cursor Prompt:**

> Build the Target Management UI for Hivemind. The Zustand store and types from Phase 1 are already in place.
>
> 1. Create `components/ui/` primitives: `Button`, `Card`, `Badge`, `Input`, `Select`, `Textarea`, `Modal`. Use Tailwind only — no UI library.
>
> 2. Create `components/targets/TargetForm.tsx` — a form (controlled, no `<form>` tag, use button `onClick`) that accepts: `label` (text), `domain` (select from `TargetDomain`), `masteryStatus` (select: in_progress | mastered | on_hold), `notes` (textarea). On submit, it calls an `onSave(target: Omit<Target, 'id' | 'createdAt' | 'updatedAt' | 'easeFactor' | 'interval' | 'repetitions' | 'nextDue'>)` prop. Default SRS values are set by the store action, not the form.
>
> 3. Create `components/targets/TargetCard.tsx` — displays label, domain badge, category badge (derived from masteryStatus: `in_progress` → `acquisition`, `mastered` → `maintenance`), lastPromptLevel, and Edit/Delete buttons.
>
> 4. Create `app/targets/page.tsx` — lists all targets from `useTargetsStore`. Has an "Add Target" button that opens `TargetForm` in a modal. Supports inline edit (re-uses `TargetForm` pre-populated). Has a search/filter bar (filter by category, domain).
>
> 5. Category derivation rule: if `masteryStatus === 'mastered'`, set `category = 'maintenance'`. Otherwise, set `category = 'acquisition'`. This logic belongs in the `addTarget` store action.
>
> Deliverable: RBT can open `/targets`, add a target, see it appear in the list, edit it, and delete it. Data survives a page refresh.

---

### Phase 3 — SRS Engine

**Goal:** The full algorithm is implemented, tested, and integrated into the Zustand session store. No UI yet — pure logic.

**Cursor Prompt:**

> Implement the Hivemind SRS engine. All types and stores from Phases 1–2 are in place.
>
> 1. Create `lib/srs/weights.ts` with:
>    - `PROMPT_LEVEL_INDEX` mapping each `PromptLevel` to 0–5.
>    - `MOOD_MULTIPLIERS` with `acquisition` and `maintenance` multipliers per `ClientMood`.
>
> 2. Create `lib/srs/engine.ts` with:
>    - `computeUrgency(target, mood, now): number` — implements the formula: `(1 / interval) * moodMultiplier * ((promptIdx + 1) / 6) * overdueBonus`. Overdue bonus is `1.5` if `now > target.nextDue`, else `1.0`.
>    - `updateTargetAfterTrial(target, trial): Target` — SM-2 variant. Maps `(outcome, promptLevel)` to a quality score 0–5 using `OUTCOME_QUALITY`. Updates `easeFactor` (min 1.3), `interval`, `repetitions`, `nextDue`, `lastPromptLevel`.
>
> 3. Create `lib/srs/queue.ts` with:
>    - `buildQueue(targets, mood, now, settings): Target[]` — filters `on_hold` targets, scores all active targets, sorts by urgency descending, enforces acquisition/maintenance slot ratio from settings, then interleaves maintenance and acquisition targets in alternating order.
>
> 4. Write unit tests in `tests/srs/engine.test.ts` using Vitest:
>    - A `frustrated` mood should increase maintenance target urgency.
>    - An `independent` correct trial should increase `interval` and `easeFactor`.
>    - A `full_physical` incorrect trial should reset `interval` to 1 and `repetitions` to 0.
>    - `buildQueue` should return maintenance targets first when mood is `frustrated`.
>
> Deliverable: `npm run test` passes all SRS unit tests.

---

### Phase 4 — Session Runner UI

**Goal:** The live session experience. RBT starts a session, gets targets one at a time, logs trials, and ends with a summary.

**Cursor Prompt:**

> Build the Session Runner UI. The SRS engine from Phase 3 and stores from Phase 1 are in place.
>
> 1. Create `components/session/MoodSelector.tsx` — three large tappable buttons: 😊 Happy, 😐 Neutral, 😤 Frustrated. Highlights the selected state. Calls `onChange(mood)` on tap.
>
> 2. Create `components/session/PromptLevelPicker.tsx` — a horizontal set of 6 buttons for each PromptLevel. Ordered from Independent → Full Physical. Selected level is highlighted. Calls `onChange(level)` on tap.
>
> 3. Create `components/session/TrialLogger.tsx` — displays the current target label and domain. Contains a `PromptLevelPicker`. Three action buttons: ✅ Correct, ❌ Incorrect, ⏭ Skip. On Correct/Incorrect, calls `onLog(outcome, promptLevel)`. On Skip, calls `onSkip()`.
>
> 4. Create `app/session/page.tsx` — the main session runner. Steps:
>    - Step 1 (Pre-session): Show `MoodSelector` and a "Start Session" button.
>    - Step 2 (Active): Calls `buildQueue(targets, mood, Date.now(), settings)` to get the initial queue. Shows a cadence timer (e.g., "Next target in: 12s" based on 3600 / cadencePerHour). Auto-advances OR RBT taps to advance. Displays `TrialLogger` for the current target. Shows a live counter: "Trials: 12 | Remaining: ~28".
>    - A floating "Update Mood" button re-runs `buildQueue` with the new mood without ending the session.
>    - "End Session" button transitions to the summary page.
>
> 5. Create `app/session/summary/page.tsx` — shows: total trials, breakdown by outcome (correct/incorrect/no response), targets practiced (with their final prompt level), and targets flagged for next session (urgency score still high).
>
> Deliverable: RBT can complete a full session loop — start, log 5+ trials across different targets, and see the summary.

---

### Phase 5 — Polish, Settings & PostgreSQL Migration Path

**Goal:** Production-ready UX, app-wide settings, navigation, and a fully wired Prisma/PostgreSQL option.

**Cursor Prompt:**

> Finalize Hivemind with polish, settings, and the PostgreSQL migration path.
>
> 1. Create `app/settings/page.tsx` with controls for:
>    - `cadencePerHour` (number input, default 30)
>    - `acquisitionWeight` (slider 0–100%, default 60%)
>    - `sessionDurationMinutes` (select: 30 / 45 / 60 / 90)
>    - `defaultMood` (MoodSelector)
>    All values persist via the `settingsStore`.
>
> 2. Create a persistent `<Sidebar />` or `<BottomNav />` (mobile-first) linking to: Dashboard `/`, Targets `/targets`, Session `/session`, Settings `/settings`.
>
> 3. Create `app/page.tsx` (Dashboard) showing:
>    - Total active targets (acquisition vs maintenance count)
>    - Last session date and trial count
>    - "Start Session" CTA button
>    - Targets overdue for review (nextDue < now)
>
> 4. Implement the PostgreSQL data layer:
>    - Create `lib/storage/db.ts` that wraps Prisma and exposes the same interface as `localStore`: `getTargets`, `saveTargets`, `getSessions`, `saveSession`, `getSettings`, `saveSettings`.
>    - Create Next.js API routes: `POST /api/targets`, `GET /api/targets`, `PATCH /api/targets/[id]`, `DELETE /api/targets/[id]`, `POST /api/sessions`, `PATCH /api/sessions/[id]`.
>    - Add an env variable `NEXT_PUBLIC_STORAGE_MODE=localstorage|postgres`. When set to `postgres`, the stores call the API routes instead of `localStore` directly.
>
> 5. Add a data export feature on the Settings page: "Export Session Data as JSON" button that downloads all sessions and targets from the active storage layer.
>
> Deliverable: Full app is navigable, settings persist, and setting `STORAGE_MODE=postgres` with a valid `DATABASE_URL` switches storage without changing any UI code.
