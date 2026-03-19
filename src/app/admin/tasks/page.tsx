"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  isDraft: boolean;
  isPublished: boolean;
  isArchived: boolean;
  startDate: string;
  dueDate: string;
  route: { yearLevel: string; subject: string; slug: string };
  scaffoldPoints: { id: string }[];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showMine, setShowMine] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsSuperAdmin(data.role === "superadmin"));
  }, []);

  async function loadTasks() {
    const url = isSuperAdmin && showMine ? "/api/tasks?mine=true" : "/api/tasks";
    const res = await fetch(url);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMine, isSuperAdmin]);

  async function handleAction(id: string, action: "publish" | "unpublish" | "archive" | "delete") {
    if (action === "delete" && !confirm("Delete this task?")) return;

    if (action === "delete") {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    } else {
      const res = await fetch(`/api/tasks/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Action failed");
        return;
      }
    }
    loadTasks();
  }

  function statusBadge(task: Task) {
    if (task.isPublished) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Published</span>;
    if (task.isArchived) return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Archived</span>;
    return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Draft</span>;
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Tasks</h1>
          {isSuperAdmin && (
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
              <button
                onClick={() => setShowMine(false)}
                className={`px-3 py-1.5 transition ${!showMine ? "bg-bh-teal text-bh-black" : "text-gray-500 hover:bg-gray-100"}`}
              >
                All
              </button>
              <button
                onClick={() => setShowMine(true)}
                className={`px-3 py-1.5 transition ${showMine ? "bg-bh-teal text-bh-black" : "text-gray-500 hover:bg-gray-100"}`}
              >
                Mine
              </button>
            </div>
          )}
        </div>
        <Link
          href="/admin/tasks/new"
          className="bg-bh-teal text-bh-black font-semibold px-4 py-2 rounded text-sm hover:bg-bh-teal-dim transition"
        >
          New Task
        </Link>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/assignments/${task.route.slug}`} className="font-medium text-bh-teal-dim hover:text-bh-teal hover:underline transition" target="_blank">
                    {task.title}
                  </Link>
                  {statusBadge(task)}
                </div>
                <div className="text-sm text-gray-500">
                  {task.route.yearLevel} — {task.route.subject} · {task.scaffoldPoints.length} scaffold points
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(task.startDate).toLocaleDateString()} → {new Date(task.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <Link href={`/admin/tasks/${task.id}/edit`} className="text-bh-teal-dim hover:text-bh-teal">
                  Edit
                </Link>
                {task.isDraft && (
                  <button onClick={() => handleAction(task.id, "publish")} className="text-green-600 hover:text-green-800">
                    Publish
                  </button>
                )}
                {task.isPublished && (
                  <button onClick={() => handleAction(task.id, "unpublish")} className="text-yellow-600 hover:text-yellow-800">
                    Unpublish
                  </button>
                )}
                {!task.isArchived && (
                  <button onClick={() => handleAction(task.id, "archive")} className="text-gray-500 hover:text-gray-700">
                    Archive
                  </button>
                )}
                <button onClick={() => handleAction(task.id, "delete")} className="text-red-500 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-gray-500 text-sm">
            No tasks yet.{" "}
            <Link href="/admin/tasks/new" className="text-bh-teal-dim hover:underline">
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
