import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}
