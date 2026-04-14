import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-50 ${className}`}
        {...props}
      />
    </div>
  );
}
