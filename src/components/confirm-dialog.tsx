"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ShieldQuestion } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  variant?: "destructive" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  variant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isDestructive = variant === "destructive";

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onCancel={onCancel}
      className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isDestructive
                ? "bg-danger/10 text-danger"
                : "bg-accent/10 text-accent"
            }`}
          >
            {isDestructive ? (
              <AlertTriangle size={18} />
            ) : (
              <ShieldQuestion size={18} />
            )}
          </span>
          <div className="min-w-0 pt-1">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 ${
              isDestructive
                ? "bg-danger text-white hover:opacity-90"
                : "bg-accent text-accent-foreground hover:opacity-90"
            }`}
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
