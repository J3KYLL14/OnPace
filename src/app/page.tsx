import Link from "next/link";
import { prisma } from "@/lib/db";
import { calendarDaysBetween, formatDay } from "@/lib/checkpoints";

export const dynamic = "force-dynamic";

export default async function Home() {
  const routes = await prisma.route.findMany({
    include: {
      tasks: {
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          dueDate: true,
        },
      },
    },
    orderBy: [{ yearLevel: "asc" }, { subject: "asc" }],
  });

  const now = new Date();

  return (
    <div className="flex min-h-screen flex-col bg-op-cream font-body text-op-ink">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-5">
        <span className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          onpace<span className="text-op-coral">.</span>
        </span>
        <Link
          href="/admin/login"
          className="rounded-xl border-2 border-op-ink px-3 py-2 text-sm font-bold text-op-ink no-underline hover:bg-white"
        >
          Teacher login
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-4">
        <h1 className="m-0 mb-2 font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] sm:text-6xl">
          What’s due?
        </h1>
        <p className="m-0 mb-8 text-lg font-medium">Pick your class to see your checkpoints and how long you’ve got.</p>

        <div className="grid gap-5 sm:grid-cols-2">
          {routes.map((route) => {
            const task = route.tasks[0];
            if (!task) {
              return (
                <div
                  key={route.id}
                  className="flex flex-col gap-2 rounded-[20px] border-[3px] border-dashed border-op-ink p-5"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.04em]">
                    {route.yearLevel} · {route.subject}
                  </span>
                  <span className="text-op-ink-soft">No task published yet</span>
                </div>
              );
            }
            const days = calendarDaysBetween(now, new Date(task.dueDate));
            const when =
              days < 0 ? "Past due" : days === 0 ? "Due today" : days === 1 ? "1 day to go" : `${days} days to go`;
            return (
              <Link
                key={route.id}
                href={`/assignments/${route.slug}`}
                className="group flex flex-col gap-3 rounded-[20px] border-[3px] border-op-ink bg-white p-5 text-op-ink no-underline shadow-hard-md transition hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                <span className="font-mono text-xs font-bold uppercase tracking-[0.04em]">
                  {route.yearLevel} · {route.subject}
                </span>
                <span className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] group-hover:underline">
                  {task.title}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-2 text-sm font-bold">
                  <span
                    className={`rounded-md border-2 border-op-ink px-2 py-0.5 font-mono text-xs uppercase ${
                      days < 0 ? "bg-op-peach" : days <= 7 ? "bg-op-yellow" : "bg-op-mint"
                    }`}
                  >
                    {when}
                  </span>
                  Due {formatDay(new Date(task.dueDate))}
                </span>
              </Link>
            );
          })}

          {/* Demo card — always shown so visitors can explore the app */}
          <Link
            href="/demo"
            className="group flex flex-col gap-3 rounded-[20px] border-[3px] border-op-ink bg-op-lavender p-5 text-op-ink no-underline shadow-hard-md transition hover:-translate-y-0.5 hover:shadow-hard-lg"
          >
            <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.04em]">
              <span className="rounded-md bg-op-ink px-2 py-0.5 text-op-cream">Demo</span>
              Year 12 · Creative Convergence
            </span>
            <span className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] group-hover:underline">
              Media Arts Production
            </span>
            <span className="mt-auto text-sm font-bold">Try it out →</span>
          </Link>
        </div>
      </main>

      <footer className="bg-op-ink text-op-cream">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-between gap-3 px-4 py-6 text-sm">
          <span>
            <strong className="font-display font-extrabold">
              onpace<span className="text-op-coral">.</span>
            </strong>{" "}
            Assessment pacing for students
          </span>
          <a
            href="https://www.benjaminhyde.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-op-cream hover:underline"
          >
            Built by Ben Hyde ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
