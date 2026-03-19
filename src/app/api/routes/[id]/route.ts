import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function assertRouteOwner(id: string, userId: string, role: string) {
  if (role === "superadmin") return true;
  const route = await prisma.route.findUnique({ where: { id }, select: { createdById: true } });
  return route?.createdById === userId;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await assertRouteOwner(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.route.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 400 });
  }
}
