"use client";

import { useEffect, useState } from "react";

import { PromptLevelPicker } from "@/components/session/PromptLevelPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PromptLevel, SessionTrial, Target } from "@/lib/types";

export type TrialLoggerProps = {
  target: Target;
  onLog: (outcome: SessionTrial["outcome"], promptLevel: PromptLevel) => void;
  onSkip: () => void;
};

function formatDomain(d: Target["domain"]): string {
  return d.replace(/_/g, " ");
}

export function TrialLogger({ target, onLog, onSkip }: TrialLoggerProps) {
  const [promptLevel, setPromptLevel] = useState<PromptLevel>(
    target.lastPromptLevel
  );
  const [sdOpen, setSdOpen] = useState(false);

  useEffect(() => {
    setPromptLevel(target.lastPromptLevel);
  }, [target.id, target.lastPromptLevel]);

  const handleSkip = () => {
    onLog("no_response", promptLevel);
    onSkip();
  };

  const hasNotes = Boolean(target.notes?.trim());

  return (
    <Card className="relative border-2 border-neutral-900 bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-800">
            Current target
          </p>
          <h2 className="mt-1 text-2xl font-bold text-neutral-950">{target.label}</h2>
          <p className="mt-1 text-sm font-semibold capitalize text-neutral-800">
            {formatDomain(target.domain)} · {target.category}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSdOpen(true)}
          disabled={!hasNotes}
          title={hasNotes ? "Show instructions / SD" : "No notes on this target"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-neutral-900 bg-neutral-100 text-lg font-bold text-neutral-950 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="View SD or notes"
        >
          ?
        </button>
      </div>

      {sdOpen ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60 p-3"
          role="presentation"
          onClick={() => setSdOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sd-title"
            className="max-h-[70%] w-full overflow-y-auto rounded-lg border-2 border-black bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="sd-title" className="text-sm font-bold text-neutral-950">
              SD / notes
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-neutral-900">
              {target.notes?.trim() || "No notes."}
            </p>
            <Button
              type="button"
              className="mt-4 w-full border-2 border-black"
              onClick={() => setSdOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <p className="mb-2 text-sm font-bold text-neutral-900">Prompt level</p>
        <PromptLevelPicker value={promptLevel} onChange={setPromptLevel} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          className="flex-1 border-2 border-emerald-950 bg-emerald-600 text-white hover:bg-emerald-500"
          onClick={() => onLog("correct", promptLevel)}
        >
          Correct
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1 border-2 border-red-950 bg-red-700 text-white hover:bg-red-600"
          onClick={() => onLog("incorrect", promptLevel)}
        >
          Incorrect
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1 border-2 border-neutral-900 font-semibold"
          onClick={handleSkip}
        >
          Skip
        </Button>
      </div>
    </Card>
  );
}
