import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:hover:bg-neutral-900",
  secondary:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 disabled:opacity-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600",
  ghost: "text-neutral-700 hover:bg-neutral-100 disabled:opacity-50",
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
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
