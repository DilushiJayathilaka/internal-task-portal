"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilterX, Lock } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TaskDTO, TaskStatus, UserSummary } from "@/lib/types";
import { TaskCard } from "@/components/task-card";
import {
  TaskFormDialog,
  type TaskFormValues,
} from "@/components/task-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, STATUS_LABEL } from "@/components/status-badge";
import { isAllowedManualTransition } from "@/lib/task-status";

type TaskBoardProps = {
  initialTasks: TaskDTO[];
  users: UserSummary[];
  activeFilters: { status?: TaskStatus; assignee?: string };
};

// Pending Review and Done are never valid drag targets for any card - both
// are reached only through their own dedicated action (evidence upload;
// admin approval), never a plain status move. See lib/task-status.ts.
const MANUALLY_UNREACHABLE: TaskStatus[] = ["EVIDENCE_SUBMITTED", "DONE"];

const COLUMNS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "EVIDENCE_SUBMITTED",
  "DONE",
];
const ALL_STATUSES = "all";
const EVERYONE = "everyone";

async function parseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

function TaskColumn({
  status,
  tasks,
  dropDisabled,
}: {
  status: TaskStatus;
  tasks: TaskDTO[];
  dropDisabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: dropDisabled,
  });
  const manuallyUnreachable = MANUALLY_UNREACHABLE.includes(status);

  return (
    <div
      ref={setNodeRef}
      className={`-m-2 space-y-3 rounded-xl p-2 transition-colors ${
        isOver ? "bg-accent/5 outline-2 outline-dashed outline-accent/40" : ""
      }`}
    >
      <h2 className="flex items-center justify-between text-sm font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          {STATUS_LABEL[status]}
          {manuallyUnreachable && (
            <Lock
              size={12}
              className="text-muted/60"
              aria-label={
                status === "DONE"
                  ? "Reached only by admin approval"
                  : "Reached only by submitting evidence"
              }
            />
          )}
        </span>
        <span className="rounded-full bg-border px-2 py-0.5 text-xs">
          {tasks.length}
        </span>
      </h2>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
            No tasks
          </li>
        )}
      </ul>
    </div>
  );
}

// Task reads (and their filtering by status/assignee) live entirely on the
// server - see tasks/page.tsx, which passes down already-filtered data.
// This component keeps a local `tasks` copy so drag-and-drop status changes
// can be applied optimistically (instant visual feedback, no round trip
// before the card moves) - it's kept in sync with the server-provided
// `initialTasks` whenever that changes (e.g. after a filter navigation),
// via the render-time "adjust state when a prop changes" pattern rather
// than an effect.
export function TaskBoard({
  initialTasks,
  users,
  activeFilters,
}: TaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function applyFilters(next: Partial<{ status: string; assignee: string }>) {
    const merged = {
      status: activeFilters.status ?? "",
      assignee: activeFilters.assignee ?? "",
      ...next,
    };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.assignee) params.set("assignee", merged.assignee);
    const qs = params.toString();
    router.push(qs ? `/tasks?${qs}` : "/tasks");
  }

  function handleCreate(values: TaskFormValues) {
    setDialogError(null);
    startTransition(async () => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(
          response,
          "Could not create the task."
        );
        setDialogError(message);
        toast.error(message);
        return;
      }

      setDialogOpen(false);
      router.refresh();
      toast.success("Task created.");
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousStatus = task.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: previousStatus } : t
        )
      );
      toast.error(
        await parseErrorMessage(response, "Could not update the status.")
      );
      return;
    }
    toast.success(`Moved to ${STATUS_LABEL[newStatus]}.`);
  }

  const hasActiveFilters = Boolean(
    activeFilters.status || activeFilters.assignee
  );
  const visibleColumns = activeFilters.status
    ? [activeFilters.status]
    : COLUMNS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted">
            Shared with everyone in the portal. Select a task to view details,
            manage it, or review evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDialogError(null);
            setDialogOpen(true);
          }}
          className="shrink-0 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          New task
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={activeFilters.status ?? ALL_STATUSES}
            onValueChange={(value) =>
              applyFilters({ status: value === ALL_STATUSES ? "" : value })
            }
          >
            <SelectTrigger className="w-38" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All</SelectItem>
              {COLUMNS.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeFilters.assignee ?? EVERYONE}
            onValueChange={(value) =>
              applyFilters({ assignee: value === EVERYONE ? "" : value })
            }
          >
            <SelectTrigger
              className="w-38"
              aria-label="Filter by assigned person"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EVERYONE}>Everyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => router.push("/tasks")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface"
          >
            <FilterX size={15} />
            Clear filters
          </button>
        )}
      </div>

      <DndContext
        id="task-board"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className={`grid grid-cols-1 items-start gap-4 ${
            visibleColumns.length > 1 ? "md:grid-cols-4" : ""
          }`}
        >
          {visibleColumns.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              dropDisabled={
                activeTask != null &&
                activeTask.status !== status &&
                !isAllowedManualTransition(activeTask.status, status)
              }
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rounded-lg border border-accent bg-surface p-4 shadow-lg">
              <h3 className="line-clamp-2 font-medium leading-snug wrap-break-word">
                {activeTask.title}
              </h3>
              <div className="mt-2">
                <StatusBadge status={activeTask.status} />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskFormDialog
        open={dialogOpen}
        mode="create"
        users={users}
        pending={isPending}
        error={dialogError}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
