import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = { title: "Create account - Internal Task Portal" };
// See login/page.tsx for why this is forced dynamic - same reasoning
// (proxy.ts's per-request CSP nonce needs a per-request render).
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <SignupForm />;
}
