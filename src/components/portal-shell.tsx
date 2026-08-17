"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

type PortalUser = {
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isActive: (pathname: string, searchParams: URLSearchParams) => boolean;
};

// "Admin Review" reuses the task list route with a status filter rather
// than being a separate page - it's the same shared task list, just
// pre-filtered to what admins need to act on.
const ADMIN_REVIEW_HREF = "/tasks?status=EVIDENCE_SUBMITTED";

function buildNavItems(role: PortalUser["role"]): NavItem[] {
  const items: NavItem[] = [
    {
      href: "/tasks",
      label: "Tasks",
      icon: ClipboardList,
      isActive: (pathname, searchParams) =>
        pathname.startsWith("/tasks") &&
        searchParams.get("status") !== "EVIDENCE_SUBMITTED",
    },
  ];

  if (role === "ADMIN") {
    items.push({
      href: ADMIN_REVIEW_HREF,
      label: "Admin Review",
      icon: ShieldCheck,
      isActive: (pathname, searchParams) =>
        pathname === "/tasks" &&
        searchParams.get("status") === "EVIDENCE_SUBMITTED",
    });
    items.push({
      href: "/users",
      label: "Users",
      icon: Users,
      isActive: (pathname) => pathname.startsWith("/users"),
    });
  }

  return items;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Client Component wrapping the whole authenticated shell: a collapsible
// left sidebar on desktop that becomes a slide-in drawer on mobile, plus
// the main content area.
export function PortalShell({
  user,
  children,
}: {
  user: PortalUser;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navItems = buildNavItems(user.role);

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface text-foreground transition-transform duration-200 ease-in-out",
          "md:sticky md:top-0 md:z-auto md:h-screen md:shrink-0 md:transition-[width] md:duration-200",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          "md:translate-x-0 md:shadow-none",
          "w-64",
          collapsed ? "md:w-19" : "md:w-64",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-16 -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm hover:text-foreground md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <div
            className={`flex items-center gap-2.5 overflow-hidden ${
              collapsed ? "md:w-0 md:opacity-0" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground">
              <LayoutDashboard size={18} />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight whitespace-nowrap">
              Internal Task Portal
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-muted hover:bg-background md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p
            className={`px-3 pb-2 text-xs font-medium tracking-wider text-muted uppercase ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon, isActive }) => {
            const active = isActive(pathname, searchParams);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed ? "md:justify-center" : "",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted hover:bg-background hover:text-foreground",
                ].join(" ")}
              >
                <Icon size={19} className="shrink-0" />
                <span className={collapsed ? "md:hidden" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div
            className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
              collapsed ? "md:justify-center" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent/10 text-xs font-semibold text-sidebar-accent">
              {initials(user.name)}
            </span>
            <div
              className={`min-w-0 leading-tight ${
                collapsed ? "md:hidden" : ""
              }`}
            >
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-1">
            <button
              type="submit"
              title={collapsed ? "Log out" : undefined}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-background dark:text-blue-400",
                collapsed ? "md:justify-center" : "",
              ].join(" ")}
            >
              <LogOut size={18} className="shrink-0" />
              <span className={collapsed ? "md:hidden" : ""}>Log out</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 hover:bg-background"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold tracking-tight">
            Internal Task Portal
          </span>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
