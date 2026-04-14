"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";

export type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-lg border border-neutral-200 bg-white shadow-lg sm:rounded-lg"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h2 id="modal-title" className="text-base font-semibold text-neutral-900">
            {title}
          </h2>
          <Button
            variant="ghost"
            className="px-2 py-1 text-neutral-500"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        </div>
        <div className="overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="border-t border-neutral-100 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
