import Link from "next/link";
import { prisma } from "@/lib/db";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-bh-black">
      {/* Header */}
      <nav className="bg-bh-charcoal">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-white">OnPace</span>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-white/50 hover:text-white/80" />
            <Link
              href="/admin/login"
              className="text-xs text-white/40 hover:text-white/70 transition"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Assessment Tasks</h1>

        <div className="space-y-3">
          {/* Demo card — always shown so visitors can explore the app */}
          <Link
            href="/demo"
            className="block bg-white dark:bg-bh-dark rounded-lg border border-bh-teal/30 dark:border-bh-teal/20 p-5 hover:border-bh-teal/60 dark:hover:border-bh-teal/50 transition group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-bh-teal-dim dark:text-bh-teal bg-bh-teal/10 px-1.5 py-0.5 rounded">
                    Demo
                  </span>
                  <span className="text-sm text-gray-500 dark:text-bh-muted">
                    Year 12 — Creative Convergence
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white group-hover:underline">
                  Media Arts Production
                </span>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-xs text-bh-teal-dim dark:text-bh-teal mt-1">
                  View demo →
                </div>
              </div>
            </div>
          </Link>

          {routes.length === 0 ? null : routes.map((route) => {
              const task = route.tasks[0];
              const slug = `/assignments/${route.slug}`;

              return (
                <div
                  key={route.id}
                  className="bg-white dark:bg-bh-dark rounded-lg border border-gray-200 dark:border-bh-surface p-5 hover:border-gray-300 dark:hover:border-bh-muted/30 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-bh-muted mb-0.5">
                        {route.yearLevel} — {route.subject}
                      </div>
                      {task ? (
                        <Link
                          href={slug}
                          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-bh-teal-dim dark:hover:text-bh-teal transition"
                        >
                          {task.title}
                        </Link>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No active task</span>
                      )}
                    </div>
                    {task && (
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Due{" "}
                          {new Date(task.dueDate).toLocaleDateString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                        <Link
                          href={slug}
                          className="text-xs text-bh-teal-dim dark:text-bh-teal hover:underline mt-1 inline-block"
                        >
                          View timeline →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-bh-surface bg-white dark:bg-bh-charcoal px-4 py-3">
        <div className="max-w-4xl mx-auto text-xs text-gray-400 dark:text-bh-muted">
          OnPace Assessment Tracker — Designed by{" "}
          <a
            href="https://www.benjaminhyde.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bh-teal-dim dark:text-bh-teal hover:underline"
          >
            Ben Hyde
          </a>
        </div>
      </footer>
    </div>
  );
}
