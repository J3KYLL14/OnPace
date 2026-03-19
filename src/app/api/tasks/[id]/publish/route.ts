import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: { routeId: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if another task is already published on this route
    const existing = await prisma.task.findFirst({
      where: {
        routeId: task.routeId,
        isPublished: true,
        id: { not: id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Another task is already published on this route. Unpublish or archive it first." },
        { status: 409 }
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { isPublished: true, isDraft: false, isArchived: false },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to publish" }, { status: 400 });
  }
}
