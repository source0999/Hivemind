"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { computeUrgency } from "@/lib/srs/engine";
import { localStore } from "@/lib/storage/localStorage";
import type { SessionTrial } from "@/lib/types";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";
import { useTargetsStore } from "@/store/targets";

function localDayBounds(now: number): { start: number; end: number } {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

function trialInRange(t: SessionTrial, start: number, end: number): boolean {
  return t.timestamp >= start && t.timestamp <= end;
}

export default function HomePage() {
  const targets = useTargetsStore((s) => s.targets);
  const loadTargets = useTargetsStore((s) => s.loadTargets);
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const activeSession = useSessionStore((s) => s.activeSession);
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => {
    loadTargets();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const { start: dayStart, end: dayEnd } = localDayBounds(Date.now());

  const sessionsSnapshot = hydrated ? localStore.getSessions() : [];
  let trialsToday = 0;
  let correct = 0;
  let incorrect = 0;
  let noResponse = 0;
  for (const s of sessionsSnapshot) {
    for (const t of s.trials) {
      if (trialInRange(t, dayStart, dayEnd)) {
        trialsToday += 1;
        if (t.outcome === "correct") correct += 1;
        else if (t.outcome === "incorrect") incorrect += 1;
        else noResponse += 1;
      }
    }
  }
  const dayStats = { trialsToday, correct, incorrect, noResponse };

  const highPriority = useMemo(() => {
    const t = Date.now();
    return targets
      .filter((x) => x.masteryStatus !== "on_hold")
      .map((x) => ({ target: x, urgency: computeUrgency(x, "neutral", t) }))
      .filter((x) => x.urgency > 1.2)
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 12);
  }, [targets]);

  const lastSession = (() => {
    if (sessionsSnapshot.length === 0) return null;
    const sorted = [...sessionsSnapshot].sort((a, b) => {
      const ta = a.endedAt ?? a.startedAt;
      const tb = b.endedAt ?? b.startedAt;
      return tb - ta;
    });
    return sorted[0] ?? null;
  })();

  const acqCount = targets.filter(
    (t) => t.category === "acquisition" && t.masteryStatus !== "on_hold"
  ).length;
  const maintCount = targets.filter(
    (t) => t.category === "maintenance" && t.masteryStatus !== "on_hold"
  ).length;

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            Hivemind
          </h1>
          <p className="mt-1 text-sm font-medium text-neutral-800">Dashboard</p>
        </div>
        <Link
          href="/settings"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-neutral-900 bg-white px-3 py-2 text-sm font-semibold text-neutral-950 shadow-sm hover:bg-neutral-50"
        >
          Settings
        </Link>
      </div>

      <Card className="mt-6 border-2 border-neutral-900 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          Session status
        </h2>
        {activeSession ? (
          <div className="mt-3 space-y-2 text-sm font-medium text-neutral-900">
            <p>
              <span className="text-neutral-700">Active</span> — mood{" "}
              <span className="capitalize">{activeSession.clientMood}</span>,{" "}
              {activeSession.trials.length} trials so far
            </p>
            <Link
              href="/session"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border-2 border-black bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Continue session
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-medium text-neutral-800">No active session</p>
            <Link
              href="/session"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border-2 border-black bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Start session
            </Link>
          </div>
        )}
      </Card>

      <Card className="mt-4 border-2 border-neutral-900 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          Today&apos;s totals
        </h2>
        <p className="mt-1 text-xs font-medium text-neutral-700">
          Trials logged today (local time)
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg border-2 border-neutral-900 bg-neutral-50 px-3 py-2">
            <dt className="text-xs font-bold text-neutral-800">Trials</dt>
            <dd className="text-xl font-bold tabular-nums text-neutral-950">
              {dayStats.trialsToday}
            </dd>
          </div>
          <div className="rounded-lg border-2 border-emerald-800 bg-emerald-50 px-3 py-2">
            <dt className="text-xs font-bold text-emerald-900">Correct</dt>
            <dd className="text-xl font-bold tabular-nums text-emerald-950">
              {dayStats.correct}
            </dd>
          </div>
          <div className="rounded-lg border-2 border-red-800 bg-red-50 px-3 py-2">
            <dt className="text-xs font-bold text-red-900">Incorrect</dt>
            <dd className="text-xl font-bold tabular-nums text-red-950">
              {dayStats.incorrect}
            </dd>
          </div>
          <div className="rounded-lg border-2 border-neutral-900 bg-amber-50 px-3 py-2">
            <dt className="text-xs font-bold text-amber-900">Skip / NR</dt>
            <dd className="text-xl font-bold tabular-nums text-amber-950">
              {dayStats.noResponse}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4 border-2 border-neutral-900 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          Active targets
        </h2>
        <p className="mt-2 text-lg font-bold text-neutral-950">
          {acqCount}{" "}
          <span className="text-sm font-semibold text-neutral-700">acquisition</span>
          {" · "}
          {maintCount}{" "}
          <span className="text-sm font-semibold text-neutral-700">maintenance</span>
        </p>
        {lastSession ? (
          <p className="mt-3 text-sm font-medium text-neutral-800">
            Last session:{" "}
            {new Date(lastSession.endedAt ?? lastSession.startedAt).toLocaleString()}{" "}
            — {lastSession.trials.length} trials
          </p>
        ) : (
          <p className="mt-3 text-sm font-medium text-neutral-700">No sessions yet</p>
        )}
      </Card>

      <Card className="mt-4 border-2 border-neutral-900 bg-amber-100 p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          High priority
        </h2>
        <p className="mt-1 text-xs font-semibold text-neutral-800">
          Neutral mood · urgency &gt; 1.2 (not on hold)
        </p>
        <ul className="mt-3 space-y-2">
          {highPriority.length === 0 ? (
            <li className="text-sm font-medium text-neutral-800">None right now</li>
          ) : (
            highPriority.map(({ target, urgency }) => (
              <li
                key={target.id}
                className="flex items-center justify-between gap-2 border-b-2 border-amber-900/20 pb-2 last:border-0"
              >
                <span className="text-sm font-semibold text-neutral-950">
                  {target.label}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-neutral-900">
                  {urgency.toFixed(2)}
                </span>
              </li>
            ))
          )}
        </ul>
      </Card>

      <p className="mt-6 text-center text-xs font-medium text-neutral-700">
        Cadence: {settings.cadencePerHour} targets/hr
      </p>
    </main>
  );
}
