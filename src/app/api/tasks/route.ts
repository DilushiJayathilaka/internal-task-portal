import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { CreateTaskSchema } from "@/lib/validation";
import { taskListInclude, toTaskDTO } from "@/lib/task-dto";
import { CREATABLE_STATUSES } from "@/lib/task-status";

// Task collection endpoint. GET is mostly used for client-side revalidation
// (the initial page load reads tasks directly via Prisma in a Server
// Component - see app/(portal)/tasks/page.tsx); POST is how the "New task"
// form in the browser creates a task.
//
// Every handler re-checks the session itself. proxy.ts already blocks
// unauthenticated requests to /api/tasks/*, but Route Handlers must not
// rely on that alone (see Next.js authentication guide) since they can be
// reached directly, and defense-in-depth is cheap here.

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: taskListInclude,
  });

  return NextResponse.json({ tasks: tasks.map(toTaskDTO) });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validated = CreateTaskSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // A brand-new task can only start at TODO or IN_PROGRESS - EVIDENCE_SUBMITTED
  // and DONE require workflow steps (evidence upload, admin approval) that
  // can't have happened for a task that doesn't exist yet. See lib/task-status.ts.
  if (validated.data.status && !CREATABLE_STATUSES.includes(validated.data.status)) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: { status: ["New tasks can only start as To do or In progress."] },
      },
      { status: 400 },
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

  const task = await prisma.task.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      status: validated.data.status ?? "TODO",
      assigneeId: validated.data.assigneeId,
      ownerId: session.userId,
    },
    include: taskListInclude,
  });

  return NextResponse.json({ task: toTaskDTO(task) }, { status: 201 });
}
