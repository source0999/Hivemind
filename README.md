# 🧠 Hivemind

> A smart session assistant for Registered Behavior Technicians (RBTs), powered by Spaced Repetition.

---

## What Is Hivemind?

Hivemind is a clinical session tool that helps RBTs run more effective ABA therapy sessions. Instead of manually tracking which targets to practice and when, Hivemind does the cognitive heavy lifting — recommending the right target, at the right moment, based on how the session is actually going.

It ingests goals and targets from a client's Behavior Intervention Plan (BIP), categorizes them, and uses a weighted Spaced Repetition System (SRS) to serve targets at an optimal cadence — adapting in real time to client mood and current prompt level.

---

## The Problem It Solves

During a session, an RBT may have 20–40 active targets across Acquisition and Maintenance. Manually cycling through them while also managing behavior, data collection, and rapport is cognitively overwhelming. Targets get skipped. High-frequency items get repeated too often. Struggling targets get avoided.

Hivemind acts as a second brain — surfacing the next best target so the RBT can focus on the client.

---

## Core Features

- **BIP Target Entry** — Add targets with domain, category, and mastery criteria
- **Acquisition / Maintenance Split** — App automatically categorizes targets based on mastery status
- **Session Cadence Engine** — Recommends targets at a configurable rate (default: 30 targets/hr)
- **SRS Algorithm** — Targets are scored and scheduled using a modified Leitner/SM-2-style system
- **Mood Weighting** — Adjusts the difficulty curve based on reported client mood (Happy → push harder; Frustrated → lean on maintenance)
- **Prompt Level Tracking** — Tracks independence level per target (Independent → Gestural → Verbal → Model → Partial Physical → Full Physical) and weights scheduling accordingly
- **Session Summary** — End-of-session view with trials run, prompt levels logged, and targets due next session
- **Offline First** — Full functionality with LocalStorage; PostgreSQL migration path included

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State / Persistence | Zustand + LocalStorage |
| DB (future) | PostgreSQL via Prisma ORM |
| Language | TypeScript |
| Testing | Vitest + React Testing Library |

---

## Algorithm Overview

Hivemind uses a modified SRS algorithm with two real-time modifiers:

### Base Score (SRS)

Each target carries an `easeFactor` and an `interval` (in sessions). After each trial:

```
nextInterval = currentInterval * easeFactor
```

Targets with short intervals bubble up in priority; mastered targets with long intervals sink to the bottom.

### Modifier 1: Client Mood

| Mood | Effect |
|---|---|
| 😊 Happy / Regulated | Boost Acquisition targets (+weight), reduce Maintenance floor |
| 😤 Frustrated / Dysregulated | Suppress Acquisition, increase easy/known Maintenance targets |

### Modifier 2: Prompt Level

The more prompting a target requires, the higher its urgency score — it needs more practice. Targets at Full Physical Prompt are deprioritized for momentum but flagged for review.

```
urgencyScore = baseScore × moodMultiplier × (1 / promptLevelIndex)
```

### Output

Every N seconds (configurable), the engine emits the top-scored target from the queue. The RBT logs the trial outcome (correct/incorrect, prompt level used), and the target is re-scored and re-queued.

---

## Project Structure

```
hivemind/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx              # Session view
│   │   └── layout.tsx
│   ├── targets/
│   │   ├── page.tsx              # Target management
│   │   └── [id]/page.tsx         # Target detail/edit
│   ├── session/
│   │   ├── page.tsx              # Active session runner
│   │   └── summary/page.tsx      # Post-session summary
│   └── settings/page.tsx         # Config (cadence, client profile)
├── components/
│   ├── ui/                       # Primitives (Button, Card, Badge, etc.)
│   ├── targets/                  # TargetCard, TargetForm, CategoryBadge
│   └── session/                  # MoodSelector, PromptLevelPicker, TrialLogger
├── lib/
│   ├── srs/
│   │   ├── engine.ts             # Core SRS algorithm
│   │   ├── weights.ts            # Mood & prompt level modifiers
│   │   └── queue.ts              # Priority queue logic
│   ├── storage/
│   │   ├── localStorage.ts       # LocalStorage adapter
│   │   └── db.ts                 # Prisma client (future)
│   └── types.ts                  # Shared TypeScript types
├── store/
│   ├── targets.ts                # Zustand: target CRUD
│   ├── session.ts                # Zustand: active session state
│   └── settings.ts               # Zustand: user preferences
├── prisma/
│   └── schema.prisma             # DB schema (PostgreSQL ready)
└── tests/
    ├── srs/engine.test.ts
    └── components/
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-org/hivemind.git
cd hivemind

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev

# 4. Open in browser
http://localhost:3000
```

No environment variables or database setup required for LocalStorage mode.

### PostgreSQL Setup (Optional)

```bash
# Copy env file and configure your DB connection
cp .env.example .env.local

# Run Prisma migrations
npx prisma migrate dev

# Seed with sample data (optional)
npx prisma db seed
```

---

## Roadmap

- [ ] Phase 1: Project scaffold, types, LocalStorage layer
- [ ] Phase 2: Target management UI (CRUD)
- [ ] Phase 3: SRS engine + weighting algorithm
- [ ] Phase 4: Active session runner UI
- [ ] Phase 5: PostgreSQL migration + session history

---

## License

MIT — built for clinicians, by people who care about the work.
