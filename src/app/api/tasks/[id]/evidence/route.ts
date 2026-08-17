import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { uploadEvidenceFile } from "@/lib/blob";
import { EvidenceMetadataSchema } from "@/lib/validation";
import { taskDetailInclude, toTaskDetailDTO } from "@/lib/task-dto";

type RouteParams = { params: Promise<{ id: string }> };

// Evidence upload: the assigned user submits a document as proof of
// completion (Part 2 requirement). Deliberately its own endpoint rather
// than folded into the generic PATCH /api/tasks/[id] - the authorization
// rule here is "you are the assignee", which is different from (and
// narrower than) the owner-or-admin rule the rest of that route uses.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.assigneeId !== session.userId) {
    return NextResponse.json(
      { error: "Only the assigned user can upload evidence for this task." },
      { status: 403 },
    );
  }
  if (task.status === "DONE") {
    return NextResponse.json({ error: "This task is already completed." }, { status: 409 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Invalid input", details: { file: ["A file is required."] } },
      { status: 400 },
    );
  }

  const validated = EvidenceMetadataSchema.safeParse({
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  });
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let blobUrl: string;
  try {
    blobUrl = await uploadEvidenceFile(id, file);
  } catch (error) {
    // Most commonly a missing/invalid BLOB_READ_WRITE_TOKEN (see README
    // "Evidence storage setup") - surface a message that actually says so
    // instead of a bare 500.
    console.error("Evidence upload failed", error);
    return NextResponse.json(
      { error: "File storage isn't configured correctly. Check BLOB_READ_WRITE_TOKEN." },
      { status: 502 },
    );
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: "EVIDENCE_SUBMITTED",
      reviewNote: null,
      evidence: {
        create: {
          fileName: validated.data.fileName,
          mimeType: validated.data.mimeType,
          fileSize: validated.data.fileSize,
          blobUrl,
          uploadedById: session.userId,
        },
      },
    },
    include: taskDetailInclude,
  });

  return NextResponse.json({ task: toTaskDetailDTO(updated) }, { status: 201 });
}
