"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { TaskForm } from "../../task-form";

interface Route {
  id: string;
  yearLevel: string;
  subject: string;
  slug: string;
}

interface ScaffoldPoint {
  label: string;
  internalDate: string;
  displayOrder: number;
  position: string;
  isKeyLabel: boolean;
  tooltipText: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  routeId: string;
  startDate: string;
  dueDate: string;
  scaffoldPoints: ScaffoldPoint[];
}

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
    ]).then(([routesData, taskData]) => {
      setRoutes(routesData);
      setTask(taskData);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/admin/tasks");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update task");
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!task) return <div className="text-red-500">Task not found</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Task</h1>
      <TaskForm
        routes={routes}
        initialData={{
          ...task,
          scaffoldPoints: task.scaffoldPoints.map((sp) => ({
            ...sp,
            tooltipText: sp.tooltipText ?? "",
          })),
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
