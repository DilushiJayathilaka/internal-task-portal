import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentRole } from "@/lib/dal";
import { taskDetailInclude, toTaskDetailDTO } from "@/lib/task-dto";

type RouteParams = { params: Promise<{ id: string }> };

// Admin approves submitted evidence, marking the task complete. ADMIN-only,
// enforced here (not just hidden in the UI) - see the Next.js
// authentication guide's guidance on treating Route Handlers like public
// API endpoints.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await requireCurrentRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { _count: { select: { evidence: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.status !== "EVIDENCE_SUBMITTED") {
    return NextResponse.json(
      { error: "Only tasks with submitted evidence pending review can be approved." },
      { status: 409 },
    );
  }
  // Defense in depth: status alone should already guarantee evidence exists
  // (the only way to reach EVIDENCE_SUBMITTED is the evidence upload
  // endpoint, which creates the record and sets the status together - see
  // lib/task-status.ts) but approval is irreversible completion, so it's
  // worth confirming directly rather than trusting that invariant blindly.
  if (task._count.evidence === 0) {
    return NextResponse.json(
      { error: "This task has no evidence submitted yet - it can't be approved." },
      { status: 409 },
    );
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: "DONE",
      approvedById: session.userId,
      approvedAt: new Date(),
      reviewNote: null,
    },
    include: taskDetailInclude,
  });

  return NextResponse.json({ task: toTaskDetailDTO(updated) });
}
