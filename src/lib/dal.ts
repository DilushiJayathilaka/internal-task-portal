import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/session";

// Data Access Layer: the single place authorization is decided. Server
// Components, Server Actions, and Route Handlers should all funnel through
// verifySession()/getCurrentUser() rather than reading the session cookie
// themselves. `cache()` de-dupes repeated calls within one render/request.
//
// proxy.ts also checks the session, but only optimistically (cookie
// presence, no DB hit) to redirect early.

/** Verifies the session exists; redirects to /login if not. Use in protected pages/layouts. */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

/** Same as verifySession but returns null instead of redirecting - use in API routes. */
export const requireSession = cache(
  async (): Promise<SessionPayload | null> => {
    return getSession();
  }
);

export const requireCurrentRole = cache(
  async (): Promise<SessionPayload | null> => {
    const session = await requireSession();
    if (!session) return null;
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    if (!user) return null;
    return { userId: session.userId, role: user.role };
  }
);

/** Loads the current user's safe (non-secret) profile fields, redirecting if unauthenticated. */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    redirect("/login");
  }
  return user;
});
