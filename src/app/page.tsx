import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// The root route has no UI of its own - it just routes the visitor to the
// right place depending on auth state. proxy.ts already redirects logged-in
// users away from /login and /signup, so this is the only place that needs
// to decide where "/" goes.
export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/tasks" : "/login");
}
