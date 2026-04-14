"use client";

import type { ClientMood } from "@/lib/types";

export type MoodSelectorProps = {
  value: ClientMood;
  onChange: (mood: ClientMood) => void;
  disabled?: boolean;
};

const MOODS: { id: ClientMood; label: string; emoji: string }[] = [
  { id: "happy", label: "Happy", emoji: "\uD83D\uDE0A" },
  { id: "neutral", label: "Neutral", emoji: "\uD83D\uDE10" },
  { id: "frustrated", label: "Frustrated", emoji: "\uD83D\uDE24" },
];

export function MoodSelector({ value, onChange, disabled }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {MOODS.map((m) => {
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center justify-center rounded-xl border-2 px-4 py-6 text-center transition-colors disabled:opacity-50 ${
              selected
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              {m.emoji}
            </span>
            <span className="mt-2 text-sm font-medium">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
