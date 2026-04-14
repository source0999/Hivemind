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

  useEffect(() => {
    setPromptLevel(target.lastPromptLevel);
  }, [target.id, target.lastPromptLevel]);

  const handleSkip = () => {
    onLog("no_response", promptLevel);
    onSkip();
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Current target
        </p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">
          {target.label}
        </h2>
        <p className="mt-1 text-sm capitalize text-neutral-600">
          {formatDomain(target.domain)} · {target.category}
        </p>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-neutral-700">
          Prompt level
        </p>
        <PromptLevelPicker
          value={promptLevel}
          onChange={setPromptLevel}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          className="flex-1 bg-emerald-700 hover:bg-emerald-800"
          onClick={() => onLog("correct", promptLevel)}
        >
          Correct
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1"
          onClick={() => onLog("incorrect", promptLevel)}
        >
          Incorrect
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={handleSkip}
        >
          Skip
        </Button>
      </div>
    </Card>
  );
}
