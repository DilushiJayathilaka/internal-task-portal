"use client";

import { useEffect, useState } from "react";
import type { TaskDTO, TaskStatus, UserSummary } from "@/lib/types";
import { STATUS_LABEL } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CREATABLE_STATUSES, manualStatusTargets } from "@/lib/task-status";

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
};

type TaskFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  task?: TaskDTO;
  users: UserSummary[];
  pending: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
};

const UNASSIGNED = "unassigned";

export function TaskFormDialog({
  open,
  mode,
  task,
  users,
  pending,
  error,
  onClose,
  onSubmit,
}: TaskFormDialogProps) {
  const currentStatus: TaskStatus = task?.status ?? "TODO";
  const statusOptions: TaskStatus[] =
    mode === "create"
      ? CREATABLE_STATUSES
      : [currentStatus, ...manualStatusTargets(currentStatus)];
  const statusLocked = mode === "edit" && statusOptions.length <= 1;
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [assigneeId, setAssigneeId] = useState<string>(
    task?.assigneeId ?? UNASSIGNED
  );

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setStatus(task?.status ?? "TODO");
      setAssigneeId(task?.assigneeId ?? UNASSIGNED);
    }
  }

  useEffect(() => {
    if (!dialogNode) return;
    if (open && !dialogNode.open) {
      dialogNode.showModal();
    } else if (!open && dialogNode.open) {
      dialogNode.close();
    }
  }, [open, dialogNode]);

  return (
    <dialog
      ref={setDialogNode}
      onClose={onClose}
      onCancel={onClose}
      className="fixed top-1/2 left-1/2 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            title: title.trim(),
            description: description.trim(),
            status,
            assigneeId: assigneeId === UNASSIGNED ? null : assigneeId,
          });
        }}
        className="space-y-4 p-6"
      >
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "New task" : "Edit task"}
        </h2>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="task-title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="task-description" className="text-sm font-medium">
            Description{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="task-description"
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="task-status" className="text-sm font-medium">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as TaskStatus)}
              disabled={statusLocked}
            >
              <SelectTrigger id="task-status" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={dialogNode}>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusLocked && (
              <p className="text-xs text-muted">
                {currentStatus === "EVIDENCE_SUBMITTED"
                  ? "Use Approve or Request changes on the task page instead."
                  : currentStatus === "DONE"
                  ? "This task is completed and can't be reopened here."
                  : null}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-assignee" className="text-sm font-medium">
              Assign to
            </label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="task-assignee" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={dialogNode}>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || title.trim().length === 0}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {pending
              ? "Saving..."
              : mode === "create"
              ? "Create task"
              : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
