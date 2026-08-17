import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentRole } from "@/lib/dal";
import { UpdateUserRoleSchema } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

// Role changes, admin-only. This is the in-app counterpart to
// `npm run make-admin` (see README "Managing user roles") - that script
// remains the way to create the *first* admin (an ADMIN-gated endpoint is
// no help before any admin exists to call it); this endpoint is how an
// existing admin manages roles afterward.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await requireCurrentRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // An admin demoting themselves (especially the only admin) would lock
  // the portal's admin functions away with no one able to reverse it from
  // inside the app - have them ask another admin, or fall back to
  // `npm run make-admin` / Prisma Studio, both of which operate outside
  // this authorization check entirely.
  if (id === session.userId) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const validated = UpdateUserRoleSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: validated.data.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    user: { ...updated, createdAt: updated.createdAt.toISOString() },
  });
}
