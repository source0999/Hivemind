"use client";

import { useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { computeUrgency } from "@/lib/srs/engine";
import { localStore } from "@/lib/storage/localStorage";
import type { Session, SessionTrial } from "@/lib/types";
import { useTargetsStore } from "@/store/targets";

function formatPrompt(level: SessionTrial["promptLevel"]): string {
  return level.replace(/_/g, " ");
}

export function SessionSummaryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const targets = useTargetsStore((s) => s.targets);
  const loadTargets = useTargetsStore((s) => s.loadTargets);

  useLayoutEffect(() => {
    loadTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = useMemo((): Session | null => {
    if (!id) return null;
    return localStore.getSessions().find((s) => s.id === id) ?? null;
  }, [id]);

  const summary = useMemo(() => {
    if (!session) return null;
    const trials = session.trials;
    const breakdown = {
      correct: trials.filter((t) => t.outcome === "correct").length,
      incorrect: trials.filter((t) => t.outcome === "incorrect").length,
      no_response: trials.filter((t) => t.outcome === "no_response").length,
    };

    const lastByTarget = new Map<string, SessionTrial>();
    for (const t of trials) {
      const prev = lastByTarget.get(t.targetId);
      if (!prev || t.timestamp >= prev.timestamp) lastByTarget.set(t.targetId, t);
    }

    const practiced = Array.from(lastByTarget.entries()).map(([targetId, trial]) => {
      const meta = targets.find((x) => x.id === targetId);
      return {
        targetId,
        label: meta?.label ?? targetId,
        promptLevel: trial.promptLevel,
      };
    });

    const now = Date.now();
    const scored = targets
      .filter((t) => t.masteryStatus !== "on_hold")
      .map((t) => ({
        target: t,
        urgency: computeUrgency(t, "neutral", now),
      }))
      .sort((a, b) => b.urgency - a.urgency);

    const medianUrgency =
      scored.length === 0
        ? 0
        : scored[Math.floor(scored.length / 2)].urgency;

    const threshold = Math.max(medianUrgency * 1.25, 1e-9);
    const flagged = scored.filter((s) => s.urgency >= threshold).slice(0, 8);

    return {
      breakdown,
      practiced,
      flagged,
      total: trials.length,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      mood: session.clientMood,
    };
  }, [session, targets]);

  if (!id) {
    return (
      <main className="mx-auto max-w-lg p-4 sm:p-6">
        <p className="text-neutral-600">No session id provided.</p>
        <Link
          href="/session"
          className="mt-4 inline-flex rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          Back to session
        </Link>
      </main>
    );
  }

  if (!session || !summary) {
    return (
      <main className="mx-auto max-w-lg p-4 sm:p-6">
        <p className="text-neutral-600">Session not found.</p>
        <Link
          href="/session"
          className="mt-4 inline-block text-sm font-medium text-neutral-900 underline"
        >
          Start a new session
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Session summary</h1>
      <p className="mt-1 text-sm text-neutral-600 capitalize">
        Mood: {summary.mood}
      </p>

      <Card className="mt-6 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Totals</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.total}</p>
        <p className="text-sm text-neutral-600">trials logged</p>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">By outcome</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-neutral-600">Correct</span>
            <span className="font-medium tabular-nums">{summary.breakdown.correct}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-neutral-600">Incorrect</span>
            <span className="font-medium tabular-nums">{summary.breakdown.incorrect}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-neutral-600">No response / skip</span>
            <span className="font-medium tabular-nums">{summary.breakdown.no_response}</span>
          </li>
        </ul>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Targets practiced</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Last logged prompt level this session
        </p>
        <ul className="mt-3 space-y-2">
          {summary.practiced.length === 0 ? (
            <li className="text-sm text-neutral-500">None</li>
          ) : (
            summary.practiced.map((p) => (
              <li
                key={p.targetId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-neutral-900">{p.label}</span>
                <Badge tone="muted" className="normal-case">
                  {formatPrompt(p.promptLevel)}
                </Badge>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          High urgency (next session)
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Neutral mood, current SRS state — at or above ~1.25× median urgency
        </p>
        <ul className="mt-3 space-y-2">
          {summary.flagged.length === 0 ? (
            <li className="text-sm text-neutral-500">None flagged</li>
          ) : (
            summary.flagged.map(({ target, urgency }) => (
              <li
                key={target.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-neutral-900">{target.label}</span>
                <span className="tabular-nums text-neutral-600">
                  {urgency.toFixed(2)}
                </span>
              </li>
            ))
          )}
        </ul>
      </Card>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/session"
          className="inline-flex flex-1 items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New session
        </Link>
        <Link
          href="/targets"
          className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          Targets
        </Link>
      </div>
    </main>
  );
}
