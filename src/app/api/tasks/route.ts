import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        route: true,
        scaffoldPoints: { orderBy: { displayOrder: "asc" } },
      },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const data = await request.json();

    const task = await prisma.task.create({
      data: {
        routeId: data.routeId,
        title: data.title,
        description: data.description || null,
        startDate: new Date(data.startDate),
        dueDate: new Date(data.dueDate),
        isDraft: true,
        isPublished: false,
        isArchived: false,
        scaffoldPoints: {
          create: (data.scaffoldPoints || []).map(
            (sp: { label: string; internalDate: string; displayOrder: number; position: string; isKeyLabel: boolean; tooltipText?: string }, i: number) => ({
              label: sp.label,
              internalDate: new Date(sp.internalDate),
              displayOrder: sp.displayOrder || i + 1,
              position: sp.position || "auto",
              isKeyLabel: sp.isKeyLabel !== false,
              tooltipText: sp.tooltipText || null,
            })
          ),
        },
      },
      include: { scaffoldPoints: true },
    });
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 400 }
    );
  }
}
