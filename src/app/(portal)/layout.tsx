import { getCurrentUser } from "@/lib/dal";
import { PortalShell } from "@/components/portal-shell";

// Defense in depth: proxy.ts already redirects unauthenticated visitors away
// from /tasks before this ever runs, but getCurrentUser() re-verifies the
// session and loads the user record. If proxy.ts were ever misconfigured or
// bypassed, this layout still refuses to render the portal for a signed-out
// visitor. See lib/dal.ts.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return <PortalShell user={user}>{children}</PortalShell>;
}
