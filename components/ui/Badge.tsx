import type { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-800 border-neutral-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  muted: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
