import { NextResponse } from "next/server";
import { requireSession } from "@/lib/dal";
import { getUserDirectory } from "@/lib/user-directory";

// Read-only user directory, used to populate "assign to" pickers. Any
// authenticated user can list portal members (names/emails only, never
// password hashes) - this isn't sensitive data within an internal tool
// where everyone already sees everyone else's tasks. Backed by the same
// cached getUserDirectory() the task list/detail pages use (see
// lib/user-directory.ts) rather than its own fresh query.
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUserDirectory();

  return NextResponse.json({ users });
}
