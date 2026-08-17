import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { TaskBoard } from "@/components/task-board";
import { taskListInclude, toTaskDTO } from "@/lib/task-dto";
import { TaskStatusValues } from "@/lib/validation";
import { getUserDirectory } from "@/lib/user-directory";
import type { TaskStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Tasks - Internal Task Portal" };

type SearchParams = Promise<{ status?: string; assignee?: string }>;

const isTaskStatus = (value: string): value is TaskStatus =>
  (TaskStatusValues as readonly string[]).includes(value);

// Reads happen straight through Prisma in this Server Component - no need to
// round-trip through /api/tasks for the initial page load. Mutations go
// through the Route Handlers under app/api/tasks, called from the Client
// Components below (TaskBoard, and the task detail screen at /tasks/[id]).
//
// Filtering by status and assigned person (the first Part 2 requirement)
// lives entirely in the URL query string, so filtered views are shareable/
// bookmarkable and the filtering itself happens as a real database query
// server-side rather than client-side over an already-fetched list.
export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const [, { status, assignee }] = await Promise.all([verifySession(), searchParams]);

  const statusFilter = status && isTaskStatus(status) ? status : undefined;
  const assigneeFilter = assignee === "unassigned" ? null : assignee || undefined;

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(statusFilter && { status: statusFilter }),
        ...(assigneeFilter !== undefined && { assigneeId: assigneeFilter }),
      },
      orderBy: { createdAt: "desc" },
      include: taskListInclude,
    }),
    getUserDirectory(),
  ]);

  return (
    <TaskBoard
      initialTasks={tasks.map(toTaskDTO)}
      users={users}
      activeFilters={{ status: statusFilter, assignee }}
    />
  );
}
