import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    return NextResponse.json({ userId: session.userId, role: session.role });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
