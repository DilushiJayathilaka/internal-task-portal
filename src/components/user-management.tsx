"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import type { UserDTO, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";

type UserManagementProps = {
  initialUsers: UserDTO[];
  currentUserId: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function parseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error ?? fallback;
}

export function UserManagement({
  initialUsers,
  currentUserId,
}: UserManagementProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<UserDTO | null>(null);

  function requestRoleChange(user: UserDTO) {
    setTarget(user);
  }

  function confirmRoleChange() {
    if (!target) return;
    const nextRole: UserRole = target.role === "ADMIN" ? "USER" : "ADMIN";

    startTransition(async () => {
      const response = await fetch(`/api/users/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!response.ok) {
        toast.error(
          await parseErrorMessage(response, "Could not update the user's role.")
        );
        setTarget(null);
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, role: nextRole } : u))
      );
      toast.success(
        nextRole === "ADMIN"
          ? `${target.name} is now an admin.`
          : `${target.name} is no longer an admin.`
      );
      setTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted">
          View everyone with access to the portal and manage who has admin
          permissions.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <ul className="divide-y divide-border">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const isAdmin = user.role === "ADMIN";

            return (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent/10 text-xs font-semibold text-sidebar-accent">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-muted">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden text-xs text-muted sm:inline">
                    Joined {formatDate(user.createdAt)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isAdmin
                        ? "bg-sidebar-accent/10 text-sidebar-accent"
                        : "bg-border text-muted"
                    }`}
                  >
                    {isAdmin ? "Admin" : "User"}
                  </span>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => requestRoleChange(user)}
                    title={
                      isSelf ? "You can't change your own role." : undefined
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAdmin ? (
                      <ShieldOff size={14} />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    {isAdmin ? "Remove admin" : "Make admin"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmDialog
        open={target !== null}
        variant={target?.role === "ADMIN" ? "destructive" : "default"}
        title={
          target?.role === "ADMIN"
            ? "Remove admin access?"
            : "Grant admin access?"
        }
        description={
          target?.role === "ADMIN"
            ? `${target?.name} will lose access to admin-only actions, including reviewing evidence and marking tasks Done.`
            : `${target?.name} will be able to review evidence, approve tasks, and manage other users' roles.`
        }
        confirmLabel={target?.role === "ADMIN" ? "Remove admin" : "Make admin"}
        pending={isPending}
        onConfirm={confirmRoleChange}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
