import type { SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ label, id, className = "", children, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={`rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-50 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
