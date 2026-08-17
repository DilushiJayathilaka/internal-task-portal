import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentRole } from "@/lib/dal";
import { RequestChangesSchema } from "@/lib/validation";
import { taskDetailInclude, toTaskDetailDTO } from "@/lib/task-dto";

type RouteParams = { params: Promise<{ id: string }> };

// Admin rejects submitted evidence and sends the task back to the assignee.
// No separate "rejected" terminal state (see schema.prisma comment) - the
// task returns to IN_PROGRESS with an optional note explaining what needs
// fixing, and the assignee resubmits through the same evidence endpoint.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await requireCurrentRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.status !== "EVIDENCE_SUBMITTED") {
    return NextResponse.json(
      { error: "Only tasks with submitted evidence pending review can be sent back." },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const validated = RequestChangesSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: "IN_PROGRESS",
      reviewNote: validated.data.note ?? null,
    },
    include: taskDetailInclude,
  });

  return NextResponse.json({ task: toTaskDetailDTO(updated) });
}
