import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { downloadEvidenceFile } from "@/lib/blob";

type RouteParams = { params: Promise<{ id: string; evidenceId: string }> };

// Evidence is stored as a private Vercel Blob (see lib/blob.ts) - Vercel
// itself refuses unauthenticated requests to a private blob's URL, so this
// route is the *only* way any evidence file's bytes can ever be read. It
// re-authenticates the requester against the portal's own session rather
// than trusting the blob URL to be a secret on its own.
//
// Open to any authenticated portal member, same as the task detail page
// that links here - viewing a task (and its evidence) has no
// owner/assignee/admin restriction in this app (see README "Key
// decisions"); only uploading and approving/rejecting evidence are
// role-gated, and those stay enforced in their own routes.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, evidenceId } = await params;
  const evidence = await prisma.taskEvidence.findUnique({ where: { id: evidenceId } });
  if (!evidence || evidence.taskId !== id) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  const stream = await downloadEvidenceFile(evidence.blobUrl);
  if (!stream) {
    return NextResponse.json({ error: "File is no longer available in storage" }, { status: 404 });
  }

  return new NextResponse(stream, {
    headers: {
      "Content-Type": evidence.mimeType,
      // `inline` (not `attachment`) so browsers preview what they can
      // (PDFs, images) instead of forcing a download - matches how the
      // blob's own public URL used to behave before it became private.
      "Content-Disposition": `inline; filename="${encodeURIComponent(evidence.fileName)}"`,
      // Private, not just uncached - this response carries the actual file
      // bytes for a document that requires a portal session to fetch at
      // all; a shared/proxy cache caching it would undermine that.
      "Cache-Control": "private, no-store",
    },
  });
}
