import Link from "next/link";
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
      <div className="flex min-h-screen items-center justify-center bg-op-cream px-4 font-body text-op-ink">
        <div className="flex max-w-md flex-col items-start gap-4 rounded-3xl border-[3px] border-op-ink bg-white p-8 shadow-hard-md">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.04em]">
            {route.yearLevel} · {route.subject}
          </span>
          <h1 className="m-0 font-display text-4xl font-extrabold leading-none tracking-[-0.03em]">
            Nothing due right now
          </h1>
          <p className="m-0 text-lg">
            There’s no assessment task published for this class yet. Check back once your teacher shares one.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-2xl border-[3px] border-op-ink bg-op-yellow px-5 font-bold text-op-ink no-underline shadow-hard"
          >
            See all classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PaceboardTimeline
      taskId={task.id}
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
        id: sp.id,
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
