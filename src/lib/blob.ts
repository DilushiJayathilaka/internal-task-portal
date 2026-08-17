import "server-only";

import { put, del, get } from "@vercel/blob";

// Thin wrapper around Vercel Blob so callers don't need to know the naming
// convention or that BLOB_READ_WRITE_TOKEN is required. Evidence files are
// namespaced under evidence/<taskId>/ so a task's uploads are easy to find
// (and to bulk-delete, if we ever add "delete task" cleanup for blobs).
//
// Stored as access: "private" - Vercel rejects unauthenticated requests to
// a private blob's URL outright, so a leaked/guessed link (or a portal
// member simply pasting the URL somewhere outside the app) can't expose
// evidence documents on its own. The tradeoff is that nothing can read a
// blob back except this app, using the same read-write token, which is why
// there's a matching downloadEvidenceFile() below and a dedicated route
// (api/tasks/[id]/evidence/[evidenceId]) that streams it through - see that
// route for the read-side authorization.

export async function uploadEvidenceFile(taskId: string, file: File) {
  const blob = await put(
    `evidence/${taskId}/${crypto.randomUUID()}-${file.name}`,
    file,
    {
      access: "private",
      addRandomSuffix: false,
    }
  );
  return blob.url;
}

/** Streams a private evidence blob's bytes back, or null if it's gone from storage. */
export async function downloadEvidenceFile(
  blobUrl: string
): Promise<ReadableStream<Uint8Array> | null> {
  const result = await get(blobUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return null;
  }
  return result.stream;
}

export async function deleteEvidenceFile(blobUrl: string) {
  try {
    await del(blobUrl);
  } catch (error) {
    console.error("Failed to delete evidence blob", blobUrl, error);
  }
}
