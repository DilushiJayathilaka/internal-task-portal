import { LayoutDashboard } from "lucide-react";

// Shared shell for the public /login and /signup screens. Kept separate
// from the (portal) layout so unauthenticated visitors never render the
// navbar/session-dependent chrome.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-blue-50 to-transparent dark:from-blue-950/30" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-700 to-blue-900 text-white shadow-lg shadow-blue-900/25">
            <LayoutDashboard size={26} />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Internal Task Portal</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage your team&apos;s tasks.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
