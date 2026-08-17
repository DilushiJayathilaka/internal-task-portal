import type { TaskStatus } from "@/lib/types";

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  EVIDENCE_SUBMITTED: "Pending review",
  DONE: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: "bg-[var(--status-todo-bg)] text-[var(--status-todo-fg)]",
  IN_PROGRESS: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  EVIDENCE_SUBMITTED: "bg-[var(--status-review-bg)] text-[var(--status-review-fg)]",
  DONE: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export { STATUS_LABEL };
