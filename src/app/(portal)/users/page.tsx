import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { UserManagement } from "@/components/user-management";

export const metadata: Metadata = { title: "Users - Internal Task Portal" };

// Admin-only, both here and in the sidebar (which doesn't even render this
// link for non-admins) and in the PATCH route this page's client component
// calls - the same defense-in-depth pattern used everywhere else in the
// app: a hidden nav link is not a security boundary, so every layer checks
// for itself. Non-admins who somehow land on this URL directly are bounced
// to /tasks rather than shown a bare 403 page.
//
// Uses getCurrentUser() (fresh from the database) rather than
// verifySession() (the session cookie's role snapshot from login time) -
// PortalLayout, one level up, already calls getCurrentUser() to decide
// whether the sidebar shows this page's own nav link, and React's cache()
// dedupes the two calls into one query per request. Using the stale
// session role here instead would let the sidebar and this redirect
// disagree: a just-promoted admin would see the Users tab but get bounced
// the moment they clicked it, until they logged out and back in.
export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/tasks");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <UserManagement
      initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      currentUserId={currentUser.id}
    />
  );
}
