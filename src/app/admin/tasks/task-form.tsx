"use client";

import { useState } from "react";

interface Route {
  id: string;
  yearLevel: string;
  subject: string;
}

interface ScaffoldPointInput {
  label: string;
  internalDate: string;
  displayOrder: number;
  position: string;
  isKeyLabel: boolean;
  tooltipText: string;
}

interface TaskFormProps {
  routes: Route[];
  initialData?: {
    title: string;
    description: string | null;
    routeId: string;
    startDate: string;
    dueDate: string;
    scaffoldPoints: ScaffoldPointInput[];
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

function toLocalDate(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

/** Normalise a date value from JSON — accepts YYYY-MM-DD or ISO strings */
function parseDateField(val: unknown): string {
  if (typeof val !== "string" || !val) return "";
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // ISO or other parseable string
  try {
    return toLocalDate(val);
  } catch {
    return "";
  }
}

const SCHEMA_EXAMPLE = `{
  "title": "Task title",
  "description": "Optional description shown on the timeline",
  "startDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "scaffoldPoints": [
    {
      "label": "Checkpoint name",
      "date": "YYYY-MM-DD",
      "position": "above",
      "isKeyLabel": true,
      "tooltip": "Hint text shown when students hover. URLs are auto-linked."
    }
  ]
}`;

export function TaskForm({ routes, initialData, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [routeId, setRouteId] = useState(initialData?.routeId || routes[0]?.id || "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? toLocalDate(initialData.startDate) : ""
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ? toLocalDate(initialData.dueDate) : ""
  );
  const [scaffoldPoints, setScaffoldPoints] = useState<ScaffoldPointInput[]>(
    initialData?.scaffoldPoints.map((sp) => ({
      ...sp,
      internalDate: toLocalDate(sp.internalDate),
      tooltipText: sp.tooltipText || "",
    })) || []
  );
  const [submitting, setSubmitting] = useState(false);

  // JSON import state
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [showSchema, setShowSchema] = useState(false);
  const [copied, setCopied] = useState(false);

  function addScaffoldPoint() {
    setScaffoldPoints([
      ...scaffoldPoints,
      {
        label: "",
        internalDate: "",
        displayOrder: scaffoldPoints.length + 1,
        position: "auto",
        isKeyLabel: true,
        tooltipText: "",
      },
    ]);
  }

  function updatePoint(index: number, field: string, value: string | number | boolean) {
    const updated = [...scaffoldPoints];
    updated[index] = { ...updated[index], [field]: value };
    setScaffoldPoints(updated);
  }

  function removePoint(index: number) {
    setScaffoldPoints(scaffoldPoints.filter((_, i) => i !== index));
  }

  /** Parse pasted JSON and populate the form fields */
  function handleJsonImport() {
    setJsonError("");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("Invalid JSON — check for missing commas or brackets.");
      return;
    }

    if (typeof parsed.title !== "string" || !parsed.title) {
      setJsonError('Missing required field: "title" (string)');
      return;
    }
    if (!parsed.startDate) {
      setJsonError('Missing required field: "startDate" (YYYY-MM-DD)');
      return;
    }
    if (!parsed.dueDate) {
      setJsonError('Missing required field: "dueDate" (YYYY-MM-DD)');
      return;
    }

    const parsedStart = parseDateField(parsed.startDate);
    const parsedDue = parseDateField(parsed.dueDate);
    if (!parsedStart) { setJsonError('"startDate" could not be parsed as a date.'); return; }
    if (!parsedDue)   { setJsonError('"dueDate" could not be parsed as a date.'); return; }

    // Parse scaffold points
    const rawPoints = Array.isArray(parsed.scaffoldPoints) ? parsed.scaffoldPoints : [];
    const points: ScaffoldPointInput[] = [];
    for (let i = 0; i < rawPoints.length; i++) {
      const sp = rawPoints[i] as Record<string, unknown>;
      if (typeof sp.label !== "string" || !sp.label) {
        setJsonError(`scaffoldPoints[${i}] is missing a "label" string.`);
        return;
      }
      // Accept either "date" or "internalDate"
      const rawDate = sp.date ?? sp.internalDate;
      const parsedDate = parseDateField(rawDate);
      if (!parsedDate) {
        setJsonError(`scaffoldPoints[${i}] is missing a valid "date" (YYYY-MM-DD).`);
        return;
      }
      const pos = typeof sp.position === "string" ? sp.position : "auto";
      points.push({
        label: sp.label,
        internalDate: parsedDate,
        displayOrder: i + 1,
        position: ["above", "below", "auto"].includes(pos) ? pos : "auto",
        isKeyLabel: sp.isKeyLabel !== false,
        tooltipText: typeof sp.tooltip === "string" ? sp.tooltip
          : typeof sp.tooltipText === "string" ? sp.tooltipText
          : "",
      });
    }

    // Apply to form
    setTitle(parsed.title as string);
    setDescription(typeof parsed.description === "string" ? parsed.description : "");
    setStartDate(parsedStart);
    setDueDate(parsedDue);
    setScaffoldPoints(points);
    setJsonText("");
    setShowJsonPanel(false);
  }

  /** Export current form state as a JSON string (for sharing / saving as template) */
  function handleExportJson() {
    const data = {
      title,
      description: description || null,
      startDate,
      dueDate,
      scaffoldPoints: scaffoldPoints.map((sp) => ({
        label: sp.label,
        date: sp.internalDate,
        position: sp.position,
        isKeyLabel: sp.isKeyLabel,
        tooltip: sp.tooltipText || null,
      })),
    };
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      title,
      description,
      routeId,
      startDate: new Date(startDate + "T00:00:00").toISOString(),
      dueDate: new Date(dueDate + "T23:59:59").toISOString(),
      scaffoldPoints: scaffoldPoints.map((sp, i) => ({
        ...sp,
        internalDate: new Date(sp.internalDate + "T00:00:00").toISOString(),
        displayOrder: i + 1,
        tooltipText: sp.tooltipText || null,
      })),
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* ── JSON import panel ── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => { setShowJsonPanel((v) => !v); setJsonError(""); }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <span>⬆ Import from JSON</span>
          <span className="text-gray-400 text-xs">{showJsonPanel ? "▲ hide" : "▼ expand"}</span>
        </button>

        {showJsonPanel && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Paste a JSON object matching the schema below. The Cohort selector stays manual.
              </p>
              <button
                type="button"
                onClick={() => setShowSchema((v) => !v)}
                className="text-xs text-bh-teal-dim hover:text-bh-teal shrink-0 ml-3"
              >
                {showSchema ? "Hide schema" : "View schema"}
              </button>
            </div>

            {showSchema && (
              <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                {SCHEMA_EXAMPLE}
              </pre>
            )}

            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError(""); }}
              placeholder='Paste JSON here…'
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono resize-y"
              rows={8}
            />

            {jsonError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                ✕ {jsonError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleJsonImport}
                disabled={!jsonText.trim()}
                className="bg-bh-teal text-bh-black font-semibold text-sm px-4 py-1.5 rounded hover:bg-bh-teal-dim transition disabled:opacity-40"
              >
                Apply JSON
              </button>
              <button
                type="button"
                onClick={() => { setJsonText(""); setJsonError(""); setShowJsonPanel(false); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Main task fields ── */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cohort</label>
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.yearLevel} — {r.subject}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* ── Scaffold points ── */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Scaffold Points</h2>
          <button
            type="button"
            onClick={addScaffoldPoint}
            className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition"
          >
            + Add Point
          </button>
        </div>

        {scaffoldPoints.length === 0 && (
          <p className="text-sm text-gray-500">No scaffold points yet. Add one to get started.</p>
        )}

        <div className="space-y-3">
          {scaffoldPoints.map((sp, i) => (
            <div key={i} className="flex gap-2 items-start border border-gray-100 p-3 rounded">
              <div className="flex-1 space-y-2">
                <input
                  value={sp.label}
                  onChange={(e) => updatePoint(i, "label", e.target.value)}
                  placeholder="Label"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={sp.internalDate}
                    onChange={(e) => updatePoint(i, "internalDate", e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    required
                  />
                  <label className="flex items-center gap-1 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={sp.isKeyLabel}
                      onChange={(e) => updatePoint(i, "isKeyLabel", e.target.checked)}
                    />
                    Key
                  </label>
                </div>
                <textarea
                  value={sp.tooltipText}
                  onChange={(e) => updatePoint(i, "tooltipText", e.target.value)}
                  placeholder="Hint / tooltip for students (optional) — paste URLs on separate lines to make them clickable"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 resize-none"
                  rows={2}
                />
              </div>
              <button
                type="button"
                onClick={() => removePoint(i)}
                className="text-red-400 hover:text-red-600 text-sm mt-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="bg-bh-teal text-bh-black font-semibold px-6 py-2 rounded hover:bg-bh-teal-dim transition disabled:opacity-50"
        >
          {submitting ? "Saving..." : initialData ? "Update Task" : "Create Task"}
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 transition"
        >
          {copied ? "✓ Copied!" : "⬇ Copy as JSON"}
        </button>
      </div>
    </form>
  );
}
