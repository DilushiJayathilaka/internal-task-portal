import type { TaskStatus } from "@/lib/types";

const MANUAL_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO"],
  EVIDENCE_SUBMITTED: [],
  DONE: [],
};

export function manualStatusTargets(from: TaskStatus): TaskStatus[] {
  return MANUAL_STATUS_TRANSITIONS[from];
}

export function isAllowedManualTransition(
  from: TaskStatus,
  to: TaskStatus
): boolean {
  return from === to || MANUAL_STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses a brand-new task may be created with - EVIDENCE_SUBMITTED/DONE require workflow steps that can't have happened yet. */
export const CREATABLE_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

export function manualTransitionErrorMessage(
  from: TaskStatus,
  to: TaskStatus
): string {
  if (to === "EVIDENCE_SUBMITTED") {
    return "A task can only move to Pending Review by having the assignee submit evidence.";
  }
  if (to === "DONE") {
    return "Only an admin can mark a task Done, by approving it from the task's evidence review.";
  }
  if (from === "EVIDENCE_SUBMITTED") {
    return "This task is pending review - use Approve or Request changes instead of changing its status directly.";
  }
  if (from === "DONE") {
    return "This task is already completed and its status can't be changed.";
  }
  return "That status change isn't allowed.";
}
