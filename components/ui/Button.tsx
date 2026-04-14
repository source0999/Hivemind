import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "border-2 border-black bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-neutral-900",
  secondary:
    "border-2 border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-50 disabled:opacity-50",
  danger:
    "border-2 border-red-900 bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 disabled:hover:bg-red-700",
  ghost: "border-2 border-neutral-900 text-neutral-800 hover:bg-neutral-100 disabled:opacity-50",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
