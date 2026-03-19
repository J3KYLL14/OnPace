import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const isSuperAdmin = session.role === "superadmin";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-bh-black">
      <nav className="bg-bh-charcoal">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-white">
              OnPace Admin
            </Link>
            <Link href="/admin/routes" className="text-sm text-white/70 hover:text-white transition">
              Cohorts
            </Link>
            <Link href="/admin/tasks" className="text-sm text-white/70 hover:text-white transition">
              Tasks
            </Link>
            {isSuperAdmin && (
              <Link href="/admin/users" className="text-sm text-white/70 hover:text-white transition">
                Users
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-white/50 hover:text-white/80" />
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
      <footer className="border-t border-gray-200 dark:border-bh-surface bg-white dark:bg-bh-charcoal px-4 py-3">
        <div className="max-w-6xl mx-auto text-xs text-gray-400 dark:text-bh-muted">
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
