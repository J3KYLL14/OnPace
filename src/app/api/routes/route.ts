import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const routes = await prisma.route.findMany({
      orderBy: { createdAt: "desc" },
      include: { tasks: { select: { id: true, title: true, isPublished: true } } },
    });
    return NextResponse.json(routes);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const { yearLevel, subject } = await request.json();
    const slug = `${yearLevel.toLowerCase().replace(/\s+/g, "")}/${subject.toLowerCase().replace(/\s+/g, "-")}`;

    const route = await prisma.route.create({
      data: { yearLevel, subject, slug },
    });
    return NextResponse.json(route);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create route" }, { status: 400 });
  }
}
