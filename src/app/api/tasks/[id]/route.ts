import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { UpdateTaskSchema } from "@/lib/validation";
import { taskListInclude, toTaskDTO } from "@/lib/task-dto";
import { isAllowedManualTransition, manualTransitionErrorMessage } from "@/lib/task-status";

type RouteParams = { params: Promise<{ id: string }> };

// Single-task endpoint: edit, delete, status changes, and reassignment all
// go through PATCH/DELETE here. Authorization rule: any authenticated
// portal member can mutate any task - there's no owner/creator restriction
// (a deliberate product decision: this is a shared internal team space, not
// a per-user list, so anyone can pick up and fix any task). Status changes
// are the exception: only moves in lib/task-status.ts's transition table are
// allowed through this generic endpoint. In particular, EVIDENCE_SUBMITTED
// and DONE are never reachable here (by anyone, admin included) - they're
// side effects of their own dedicated actions (evidence upload; admin
// approval) with invariants a plain status field can't express.

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const validated = UpdateTaskSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (validated.data.status && !isAllowedManualTransition(existing.status, validated.data.status)) {
    return NextResponse.json(
      { error: manualTransitionErrorMessage(existing.status, validated.data.status) },
      { status: 409 },
    );
  }

  if (validated.data.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: validated.data.assigneeId } });
    if (!assignee) {
      return NextResponse.json(
        { error: "Invalid input", details: { assigneeId: ["That user doesn't exist."] } },
        { status: 400 },
      );
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: validated.data,
    include: taskListInclude,
  });

  return NextResponse.json({ task: toTaskDTO(task) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
