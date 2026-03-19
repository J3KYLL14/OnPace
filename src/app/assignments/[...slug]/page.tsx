import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PaceboardTimeline } from "./timeline";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export const dynamic = "force-dynamic";

export default async function PublicPaceboard({ params }: Props) {
  const { slug } = await params;
  const fullSlug = slug.join("/");

  const route = await prisma.route.findUnique({
    where: { slug: fullSlug },
  });

  if (!route) notFound();

  const task = await prisma.task.findFirst({
    where: { routeId: route.id, isPublished: true },
    include: {
      scaffoldPoints: { orderBy: { displayOrder: "asc" } },
    },
  });

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {route.yearLevel} — {route.subject}
          </h1>
          <p className="text-gray-500">No active task published for this route.</p>
        </div>
      </div>
    );
  }

  return (
    <PaceboardTimeline
      task={{
        title: task.title,
        description: task.description,
        startDate: task.startDate.toISOString(),
        dueDate: task.dueDate.toISOString(),
      }}
      route={{
        yearLevel: route.yearLevel,
        subject: route.subject,
      }}
      scaffoldPoints={task.scaffoldPoints.map((sp) => ({
        label: sp.label,
        internalDate: sp.internalDate.toISOString(),
        displayOrder: sp.displayOrder,
        position: sp.position as "above" | "below" | "auto",
        isKeyLabel: sp.isKeyLabel,
        tooltipText: sp.tooltipText ?? null,
      }))}
      serverTime={new Date().toISOString()}
    />
  );
}
