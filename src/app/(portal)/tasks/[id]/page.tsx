import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { taskDetailInclude, toTaskDetailDTO } from "@/lib/task-dto";
import { getUserDirectory } from "@/lib/user-directory";
import { TaskDetailView } from "@/components/task-detail-view";

type RouteParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });
  return { title: task ? `${task.title} - Internal Task Portal` : "Task not found" };
}

// The Part 2 "dedicated task details screen": selecting a task from the
// list navigates here instead of opening an inline edit dialog. Everyone in
// the portal can view it (shared portal, same as the list); the management
// controls rendered inside TaskDetailView (edit/delete/reassign, evidence
// upload, admin review) each apply their own narrower authorization rule
// client-side for UI purposes, backed by the real checks in the
// corresponding Route Handlers.
export default async function TaskDetailPage({ params }: RouteParams) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const [task, users] = await Promise.all([
    prisma.task.findUnique({ where: { id }, include: taskDetailInclude }),
    getUserDirectory(),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <TaskDetailView
      initialTask={toTaskDetailDTO(task)}
      users={users}
      currentUser={{ id: currentUser.id, role: currentUser.role }}
    />
  );
}
