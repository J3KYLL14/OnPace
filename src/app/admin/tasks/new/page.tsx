"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskForm } from "../task-form";

interface Route {
  id: string;
  yearLevel: string;
  subject: string;
  slug: string;
}

export default function NewTaskPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then(setRoutes)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/admin/tasks");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create task");
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Task</h1>
      <TaskForm routes={routes} onSubmit={handleSubmit} />
    </div>
  );
}
