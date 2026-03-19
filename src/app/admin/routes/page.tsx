"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Route {
  id: string;
  yearLevel: string;
  subject: string;
  slug: string;
  tasks: { id: string; title: string; isPublished: boolean }[];
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [yearLevel, setYearLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showMine, setShowMine] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsSuperAdmin(data.role === "superadmin"));
  }, []);

  async function loadRoutes() {
    const url = isSuperAdmin && showMine ? "/api/routes?mine=true" : "/api/routes";
    const res = await fetch(url);
    if (res.ok) setRoutes(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadRoutes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMine, isSuperAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yearLevel, subject }),
    });
    setYearLevel("");
    setSubject("");
    loadRoutes();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this cohort and all its tasks?")) return;
    await fetch(`/api/routes/${id}`, { method: "DELETE" });
    loadRoutes();
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Cohorts</h1>
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

      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg border border-gray-200 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
          <input
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
            placeholder="e.g. Year 12"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Digital Solutions"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-bh-teal text-bh-black font-semibold px-4 py-2 rounded text-sm hover:bg-bh-teal-dim transition"
        >
          Add Cohort
        </button>
      </form>

      <div className="space-y-2">
        {routes.map((route) => (
          <div
            key={route.id}
            className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">
                {route.yearLevel} — {route.subject}
              </div>
              <div className="text-sm text-gray-500">
                <Link href={`/assignments/${route.slug}`} className="hover:underline" target="_blank">
                  /assignments/{route.slug}
                </Link>
                {route.tasks.length > 0 && (
                  <span className="ml-3">
                    {route.tasks.length} task{route.tasks.length !== 1 ? "s" : ""}
                    {route.tasks.some((t) => t.isPublished) && (
                      <span className="ml-1 text-green-600">● published</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(route.id)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
        {routes.length === 0 && (
          <p className="text-gray-500 text-sm">No cohorts yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
