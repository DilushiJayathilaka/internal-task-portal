import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in - Internal Task Portal" };
// Forced dynamic rather than left to prerender: proxy.ts's CSP uses a fresh
// nonce per request (see proxy.ts), and a nonce baked into a build-time
// static page would never match what any given request's CSP header
// actually says - the browser would refuse to run the page's own scripts.
// Negligible cost here; this page is a lightweight form, not a data-heavy
// route.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
