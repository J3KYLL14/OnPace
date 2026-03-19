import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function assertTaskOwner(id: string, userId: string, role: string) {
  if (role === "superadmin") return true;
  const task = await prisma.task.findUnique({ where: { id }, select: { createdById: true } });
  return task?.createdById === userId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await assertTaskOwner(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        route: true,
        scaffoldPoints: { orderBy: { displayOrder: "asc" } },
      },
    });
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await assertTaskOwner(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const data = await request.json();

    type SpInput = { label: string; internalDate: string; displayOrder: number; position: string; isKeyLabel: boolean; tooltipText?: string | null };

    // Run everything in a transaction so scaffold points are never left in a half-deleted state
    const updated = await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description || null,
          routeId: data.routeId,
          startDate: new Date(data.startDate),
          dueDate: new Date(data.dueDate),
        },
      });

      if (data.scaffoldPoints) {
        await tx.scaffoldPoint.deleteMany({ where: { taskId: id } });
        await tx.scaffoldPoint.createMany({
          data: (data.scaffoldPoints as SpInput[]).map((sp, i) => ({
            taskId: id,
            label: sp.label,
            internalDate: new Date(sp.internalDate),
            displayOrder: sp.displayOrder || i + 1,
            position: sp.position || "auto",
            isKeyLabel: sp.isKeyLabel !== false,
            tooltipText: sp.tooltipText ?? null,
          })),
        });
      }

      return tx.task.findUnique({
        where: { id },
        include: { scaffoldPoints: { orderBy: { displayOrder: "asc" } }, route: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/tasks/[id] error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update", detail: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await assertTaskOwner(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 400 });
  }
}
