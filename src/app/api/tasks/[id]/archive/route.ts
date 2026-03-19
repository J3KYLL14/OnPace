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
    const updated = await prisma.task.update({
      where: { id },
      data: { isPublished: false, isArchived: true, isDraft: false },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to archive" }, { status: 400 });
  }
}
