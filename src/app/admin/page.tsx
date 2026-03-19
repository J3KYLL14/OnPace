import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const [routeCount, taskCount, publishedCount] = await Promise.all([
    prisma.route.count(),
    prisma.task.count(),
    prisma.task.count({ where: { isPublished: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-3xl font-bold">{routeCount}</div>
          <div className="text-sm text-gray-500">Cohorts</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-3xl font-bold">{taskCount}</div>
          <div className="text-sm text-gray-500">Tasks</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-3xl font-bold">{publishedCount}</div>
          <div className="text-sm text-gray-500">Published</div>
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          href="/admin/routes"
          className="bg-white border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 transition text-sm"
        >
          Manage Cohorts
        </Link>
        <Link
          href="/admin/tasks/new"
          className="bg-bh-teal text-bh-black font-semibold px-4 py-2 rounded hover:bg-bh-teal-dim transition text-sm"
        >
          Create Task
        </Link>
      </div>
    </div>
  );
}
