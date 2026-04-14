"use client";

import type { PromptLevel } from "@/lib/types";

const LEVELS: PromptLevel[] = [
  "independent",
  "gestural",
  "verbal",
  "model",
  "partial_physical",
  "full_physical",
];

function label(level: PromptLevel): string {
  return level.replace(/_/g, " ");
}

export type PromptLevelPickerProps = {
  value: PromptLevel;
  onChange: (level: PromptLevel) => void;
  disabled?: boolean;
};

export function PromptLevelPicker({
  value,
  onChange,
  disabled,
}: PromptLevelPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LEVELS.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`rounded-lg border px-2 py-2 text-center text-xs font-medium capitalize sm:min-w-[5.5rem] sm:px-3 sm:text-sm ${
              selected
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
            } disabled:opacity-50`}
          >
            {label(level)}
          </button>
        );
      })}
    </div>
  );
}
