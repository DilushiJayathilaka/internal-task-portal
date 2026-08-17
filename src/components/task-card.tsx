"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, UserRound } from "lucide-react";
import type { TaskDTO } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export function TaskCard({ task }: { task: TaskDTO }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? "relative z-10 opacity-60" : "relative"}
    >
      <div className="rounded-lg border border-border bg-surface shadow-sm transition-colors hover:border-blue-300 hover:shadow-md">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="absolute top-3 right-3 touch-none rounded p-0.5 text-muted/70 hover:text-muted active:cursor-grabbing"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          aria-label={`Drag to move "${task.title}" to a different status`}
        >
          <GripVertical size={16} />
        </button>

        <Link href={`/tasks/${task.id}`} className="block p-4 pr-8">
          <h3 className="line-clamp-2 font-medium leading-snug wrap-break-word">
            {task.title}
          </h3>
          <div className="mt-2">
            <StatusBadge status={task.status} />
          </div>

          <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted">
            {task.description}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <UserRound size={13} className="shrink-0" />
              {task.assignee ? task.assignee.name : "Unassigned"}
            </span>
            <span>{formatDate(task.createdAt)}</span>
          </div>
        </Link>
      </div>
    </li>
  );
}
