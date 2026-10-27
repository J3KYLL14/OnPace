"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getProgressPercent, getPointPercent, isOverdue } from "@/lib/pacing";
import {
  buildIcs,
  calendarDaysBetween,
  formatDay,
  formatTime,
  parseNotes,
  parseTicks,
  readTicksRaw,
  relativeDay,
  subscribeTicks,
  weekMarkers,
  writeTicks,
} from "@/lib/checkpoints";

interface Props {
  /** Stable id used to save this student's ticks in their browser. */
  taskId: string;
  task: {
    title: string;
    description: string | null;
    startDate: string;
    dueDate: string;
  };
  route: {
    yearLevel: string;
    subject: string;
  };
  scaffoldPoints: {
    id: string;
    label: string;
    internalDate: string;
    displayOrder: number;
    /** Kept for the admin editor; the student view no longer needs it. */
    position?: "above" | "below" | "auto";
    isKeyLabel: boolean;
    tooltipText: string | null;
  }[];
  serverTime: string;
}

type Status = "done" | "next" | "missed" | "later";

const STATUS_STYLES: Record<
  Status,
  { text: string; row: string; chip: string; dot: string }
> = {
  done: { text: "Done", row: "bg-op-mint-soft", chip: "bg-op-mint", dot: "bg-op-mint" },
  next: {
    text: "Up next",
    row: "bg-op-yellow-soft shadow-hard-md",
    chip: "bg-op-yellow",
    dot: "bg-op-coral",
  },
  missed: { text: "Not ticked", row: "bg-white", chip: "bg-op-peach", dot: "bg-op-peach" },
  later: { text: "Later", row: "bg-white", chip: "bg-op-sand", dot: "bg-op-cream" },
};

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono text-xs font-bold uppercase tracking-[0.04em] ${className}`}
    >
      {children}
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function TeacherNotes({ text }: { text: string | null }) {
  const { paragraphs, links } = parseNotes(text);
  if (!paragraphs.length && !links.length) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border-2 border-op-ink bg-op-cream p-4">
      <Eyebrow className="text-[11px]">From your teacher</Eyebrow>
      {paragraphs.map((p, i) => (
        <p key={i} className="m-0">{p}</p>
      ))}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-op-ink bg-white px-3.5 py-2 text-[15px] font-bold text-op-ink no-underline transition hover:-translate-y-0.5 hover:shadow-hard-sm"
            >
              {l.label}
              <ArrowIcon />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaceboardTimeline({ taskId, task, route, scaffoldPoints, serverTime }: Props) {
  // "now" starts from the server's clock so the first render matches, then ticks every minute.
  const [now, setNow] = useState(() => new Date(serverTime));
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  // Student ticks live in this browser's localStorage, keyed by task.
  const ticksRaw = useSyncExternalStore(
    subscribeTicks,
    () => readTicksRaw(taskId),
    () => null
  );
  const doneIds = useMemo(() => new Set(parseTicks(ticksRaw)), [ticksRaw]);

  function toggleDone(id: string) {
    const next = new Set(doneIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeTicks(taskId, [...next]);
  }

  const [selectedId, setSelectedId] = useState<string | null | "none">(null);

  const startDate = new Date(task.startDate);
  const dueDate = new Date(task.dueDate);
  const overdue = isOverdue(dueDate, now);
  const timePct = Math.round(getProgressPercent(startDate, dueDate, now));
  const daysLeft = calendarDaysBetween(now, dueDate);
  const daysOver = calendarDaysBetween(dueDate, now);

  const points = [...scaffoldPoints]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((sp) => ({ ...sp, date: new Date(sp.internalDate) }));

  const nextIdx = points.findIndex((p) => p.date > now && !doneIds.has(p.id));
  const firstFutureIdx = points.findIndex((p) => p.date > now);
  const activeId =
    selectedId === "none" ? null : selectedId ?? points[nextIdx]?.id ?? points.at(-1)?.id ?? null;

  // Lift a marker above the track if it would sit on top of its neighbour
  const lanes: number[] = [];
  points.forEach((p, i) => {
    const pct = getPointPercent(startDate, dueDate, p.date);
    const prev = i > 0 ? getPointPercent(startDate, dueDate, points[i - 1].date) : -100;
    lanes.push(pct - prev < 3.5 && (lanes[i - 1] ?? 0) === 0 ? 1 : 0);
  });

  const items = points.map((p, i) => {
    const done = doneIds.has(p.id);
    const status: Status = done
      ? "done"
      : i === nextIdx
      ? "next"
      : p.date < now
      ? "missed"
      : "later";
    const pct = getPointPercent(startDate, dueDate, p.date);
    const lane = lanes[i];
    return {
      ...p,
      num: i + 1,
      done,
      status,
      pct,
      lane,
      dayLabel: formatDay(p.date),
      rel: relativeDay(calendarDaysBetween(now, p.date)),
      hasNotes: !!p.tooltipText?.trim(),
      open: p.id === activeId,
    };
  });

  const ticked = items.filter((i) => i.done).length;
  const total = items.length;
  const expected = items.filter((i) => i.date < now).length;
  const gap = ticked - expected;
  const firstMissed = items.find((i) => i.status === "missed");
  const next = nextIdx >= 0 ? items[nextIdx] : null;
  const selected = items.find((i) => i.open) ?? null;

  let pace: { label: string; message: string; bg: string };
  if (gap > 0) {
    pace = {
      label: "Ahead of pace",
      bg: "bg-op-mint",
      message: "You’re ahead of the plan. Use the spare time to polish, or get feedback early.",
    };
  } else if (gap === 0) {
    pace = {
      label: "On pace",
      bg: "bg-op-mint",
      message: next
        ? `You’ve ticked off everything due so far. Next up: ${next.label}, ${next.rel}.`
        : "Everything is ticked off. Do a final check before you submit.",
    };
  } else {
    pace = {
      label: `${-gap} behind`,
      bg: "bg-op-peach",
      message: firstMissed
        ? `Start with ${firstMissed.label}${next ? `, then move on to ${next.label}` : ""}. Ask your teacher if you’re stuck.`
        : "Ask your teacher if you’re stuck.",
    };
  }

  const countdown = overdue
    ? daysOver <= 0
      ? { big: "Today", small: "was the due date" }
      : { big: String(daysOver), small: daysOver === 1 ? "day overdue" : "days overdue" }
    : daysLeft <= 0
    ? { big: "Today", small: `due at ${formatTime(dueDate)}` }
    : { big: String(daysLeft), small: daysLeft === 1 ? "day to go" : "days to go" };

  const weeks = weekMarkers(startDate, dueDate);
  const edgeShift = (pct: number) =>
    pct < 10 ? "translateX(-16px)" : pct > 90 ? "translateX(calc(-100% + 16px))" : "translateX(-50%)";

  function downloadCalendar() {
    const ics = buildIcs({
      uidPrefix: taskId,
      taskTitle: task.title,
      dueDate,
      events: points.map((p) => ({ id: p.id, label: p.label, date: p.date, notes: p.tooltipText })),
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "task"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-op-cream font-body text-base leading-normal text-op-ink">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="font-display text-[26px] font-extrabold tracking-[-0.04em] text-op-ink no-underline">
          onpace<span className="text-op-coral">.</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden rounded-lg border-2 border-op-ink bg-op-lavender px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.04em] sm:inline-block">
            {route.yearLevel} · {route.subject}
          </span>
          <button
            type="button"
            onClick={downloadCalendar}
            className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-[3px] border-op-ink bg-op-yellow px-4 py-2.5 text-base font-bold text-op-ink shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard-md active:translate-y-0 active:shadow-hard-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span className="hidden sm:inline">Add to my calendar</span>
            <span className="sm:hidden">Calendar</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-7 px-4 pb-16 pt-1 sm:gap-9 sm:px-6">
        {/* Hero */}
        <section
          aria-label="Task summary"
          className={`grid items-end gap-6 rounded-3xl border-[3px] border-op-ink p-5 shadow-hard-md sm:gap-8 sm:p-10 sm:shadow-hard-lg md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] ${
            overdue ? "bg-op-ink text-op-cream" : "bg-op-coral text-op-ink"
          }`}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <Eyebrow>
              <span className="sm:hidden">{route.yearLevel} · {route.subject} · </span>
              Started {formatDay(startDate)}
            </Eyebrow>
            <h1 className="m-0 font-display text-[38px] font-extrabold leading-[0.95] tracking-[-0.04em] text-balance sm:text-6xl lg:text-[72px]">
              {task.title}
            </h1>
            {task.description && (
              <p className="m-0 max-w-[46ch] text-lg font-medium">{task.description}</p>
            )}
          </div>

          <div
            className={`flex w-full flex-col gap-1.5 rounded-[20px] border-[3px] border-op-ink p-5 text-op-ink shadow-hard-md sm:p-6 md:justify-self-end ${
              overdue ? "bg-op-coral" : "bg-op-cream"
            }`}
            suppressHydrationWarning
          >
            <Eyebrow>
              {overdue ? "Past the due date" : daysLeft <= 7 ? "Final week" : "Time left"}
            </Eyebrow>
            <div className="flex flex-wrap items-baseline gap-3" suppressHydrationWarning>
              <span className="font-display text-[64px] font-extrabold leading-[0.9] tracking-[-0.05em] sm:text-[96px]">
                {countdown.big}
              </span>
              <span className="font-display text-xl font-bold leading-tight sm:text-2xl">
                {countdown.small}
              </span>
            </div>
            <span className="font-bold">
              Due {formatDay(dueDate)} · {formatTime(dueDate)}
            </span>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between font-mono text-xs font-bold">
                <span>TIME USED</span>
                <span suppressHydrationWarning>{timePct}%</span>
              </div>
              <div
                className="h-3.5 overflow-hidden rounded-full border-2 border-op-ink bg-white"
                role="progressbar"
                aria-label="Time used"
                aria-valuenow={timePct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full bg-op-ink transition-[width] duration-700" style={{ width: `${timePct}%` }} />
              </div>
            </div>
          </div>
        </section>

        {overdue && (
          <div role="status" className="rounded-[18px] border-[3px] border-op-ink bg-op-peach px-5 py-4 text-lg font-bold sm:px-6 sm:py-5">
            This task was due {formatDay(dueDate)}. If you haven’t submitted yet, talk to your teacher today about your next step.
          </div>
        )}

        {/* Now: up next + pace */}
        <section aria-label="What to do now" className="grid gap-6 sm:gap-7 md:grid-cols-2">
          <div className="flex flex-col gap-3.5 rounded-[20px] border-[3px] border-op-ink bg-op-yellow-soft p-5 shadow-hard-md sm:p-7">
            <Eyebrow>
              {next ? `Up next · ${next.rel}` : overdue ? "Final step" : "Last step"}
            </Eyebrow>
            <h2 className="m-0 font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] sm:text-[40px]">
              {next ? next.label : "Check it and submit"}
            </h2>
            <p className="m-0 font-bold">
              {next ? `${next.dayLabel} · ${formatTime(next.date)}` : `Due ${formatDay(dueDate)} · ${formatTime(dueDate)}`}
            </p>
            {next && <TeacherNotes text={next.tooltipText} />}
          </div>

          {total > 0 && (
            <div className={`flex flex-col gap-4 rounded-[20px] border-[3px] border-op-ink p-5 shadow-hard-md sm:p-7 ${pace.bg}`}>
              <Eyebrow>Your pace</Eyebrow>
              <h2 className="m-0 font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] sm:text-[40px]">
                {pace.label}
              </h2>
              <p className="m-0 font-medium">{pace.message}</p>
              <div className="mt-auto flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono text-xs font-bold">
                    <span>CHECKPOINTS TICKED</span>
                    <span>{ticked} of {total}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full border-2 border-op-ink bg-white">
                    <div className="h-full bg-op-ink transition-[width] duration-500" style={{ width: `${(ticked / total) * 100}%` }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-mono text-xs font-bold">
                    <span>DUE BY NOW</span>
                    <span>{expected} of {total}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full border-2 border-op-ink bg-white">
                    <div
                      className="h-full"
                      style={{
                        width: `${(expected / total) * 100}%`,
                        background: "repeating-linear-gradient(135deg, #1a1a1a 0 4px, #ffffff 4px 8px)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Horizontal timeline — tablets and up */}
        {total > 0 && (
          <section aria-label="Timeline" className="hidden rounded-[20px] border-[3px] border-op-ink bg-white px-10 pb-6 pt-7 md:block">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="m-0 font-display text-[28px] font-extrabold tracking-[-0.03em]">
                The road to {formatDay(dueDate)}
              </h2>
              <div className="flex flex-wrap gap-3.5 text-[13px] font-bold">
                {(["done", "next", "missed", "later"] as Status[]).map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={`h-3.5 w-3.5 rounded-full border-2 border-op-ink ${STATUS_STYLES[s].dot}`} />
                    {s === "done" ? "Ticked off" : s === "missed" ? "Passed, not ticked" : STATUS_STYLES[s].text}
                  </span>
                ))}
              </div>
            </div>
            <p className="m-0 mb-2 text-sm text-op-ink-soft">Click a number to see that checkpoint.</p>

            <div className="relative h-[200px]">
              {selected && (
                <div
                  className="absolute top-0 flex flex-col whitespace-nowrap rounded-xl bg-op-ink px-3.5 py-2 text-op-cream"
                  style={{ left: `${selected.pct}%`, transform: edgeShift(selected.pct) }}
                >
                  <span className="text-[15px] font-bold">{selected.label}</span>
                  <span className="font-mono text-xs">{selected.dayLabel} · {selected.rel}</span>
                </div>
              )}

              <div className="absolute inset-x-0 top-24 h-[18px] overflow-hidden rounded-full border-[3px] border-op-ink bg-op-cream">
                <div className="h-full bg-op-yellow" style={{ width: `${timePct}%` }} suppressHydrationWarning />
              </div>

              {/* Today line + flag */}
              <div
                className="absolute bottom-11 top-[72px] -ml-[1.5px] w-[3px] bg-op-ink"
                style={{ left: `${timePct}%` }}
                suppressHydrationWarning
              />
              <div
                className="absolute top-[150px] whitespace-nowrap rounded-lg border-2 border-op-ink bg-op-yellow px-2 py-0.5 font-mono text-xs font-bold"
                style={{ left: `${timePct}%`, transform: edgeShift(timePct) }}
                suppressHydrationWarning
              >
                TODAY · {formatDay(now)}
              </div>

              {weeks.map((w) => (
                <div
                  key={w.label}
                  className="absolute top-[120px] flex -translate-x-1/2 flex-col items-center whitespace-nowrap font-mono text-[11px] text-op-ink-soft"
                  style={{ left: `${w.left}%` }}
                >
                  <span className="h-2 w-0.5 bg-op-ink" />
                  <span>{w.label.toUpperCase()}</span>
                </div>
              ))}

              {items.map((item) => {
                const size = item.isKeyLabel ? 34 : 26;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.open ? "none" : item.id)}
                    aria-label={`Checkpoint ${item.num}: ${item.label}, ${item.dayLabel}`}
                    aria-pressed={item.open}
                    className={`absolute flex -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-[3px] border-op-ink p-0 font-mono text-sm font-bold text-op-ink transition hover:scale-110 ${STATUS_STYLES[item.status].dot} ${
                      item.open ? "ring-4 ring-op-cream outline-[3px] outline-offset-4 outline-op-ink outline" : ""
                    }`}
                    style={{
                      left: `${item.pct}%`,
                      top: item.lane === 1 ? 50 : 105 - size / 2 + 3,
                      width: size,
                      height: size,
                    }}
                  >
                    {item.done ? <CheckIcon /> : item.num}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Checkpoint list — doubles as the vertical timeline on phones */}
        {total > 0 && (
          <section aria-label="Checkpoints" className="flex flex-col">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">
                Checkpoints
              </h2>
              <span className="text-sm text-op-ink-soft">
                Tick each one off as you finish it. Your ticks are saved on this device only.
              </span>
            </div>

            {items.map((item, i) => {
              const s = STATUS_STYLES[item.status];
              const isLast = i === items.length - 1;
              return (
                <div key={item.id}>
                  {i === firstFutureIdx && (
                    <div className="flex items-center gap-2.5 pb-3 pt-1" suppressHydrationWarning>
                      <span className="flex w-9 justify-center sm:w-10">
                        <span className="h-3.5 w-3.5 rounded-full bg-op-ink ring-4 ring-op-yellow" />
                      </span>
                      <span className="rounded-lg border-2 border-op-ink bg-op-yellow px-2 py-0.5 font-mono text-xs font-bold">
                        YOU ARE HERE · {formatDay(now).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-stretch gap-2.5 sm:gap-4">
                    {/* Rail */}
                    <div className="flex w-9 flex-none flex-col items-center sm:w-10">
                      <span
                        aria-hidden="true"
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full border-[3px] border-op-ink font-mono text-sm font-bold sm:h-10 sm:w-10 ${s.dot}`}
                      >
                        {item.done ? <CheckIcon /> : item.num}
                      </span>
                      {!isLast && (
                        <span className={`min-h-3 w-[3px] flex-1 ${item.date < now ? "bg-op-ink" : "bg-op-rail"}`} />
                      )}
                    </div>

                    <article
                      className={`mb-4 flex min-w-0 flex-1 flex-col gap-3 rounded-[18px] border-[3px] border-op-ink px-4 py-3.5 sm:px-5 sm:py-4 ${
                        item.isKeyLabel ? "border-solid" : "border-dashed"
                      } ${s.row}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                        <div className="flex min-w-0 flex-[1_1_220px] flex-col">
                          <span className={`mb-1 self-start rounded-md border-2 border-op-ink px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase sm:hidden ${s.chip}`}>
                            {s.text}
                          </span>
                          <h3 className="m-0 text-lg font-bold leading-tight sm:text-xl">
                            {item.label}
                            {!item.isKeyLabel && (
                              <span className="ml-2 align-middle font-mono text-[11px] font-bold uppercase text-op-ink-soft">minor</span>
                            )}
                          </h3>
                          <span className="text-[15px] text-op-ink-soft" suppressHydrationWarning>
                            {item.dayLabel} · {item.rel}
                          </span>
                        </div>
                        <span className={`hidden rounded-md border-2 border-op-ink px-2 py-1 font-mono text-xs font-bold uppercase sm:inline-block ${s.chip}`}>
                          {s.text}
                        </span>
                        <div className="flex w-full gap-2 sm:w-auto">
                          <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-op-ink bg-white px-3 text-[15px] font-bold sm:flex-none">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleDone(item.id)}
                              className="m-0 h-5 w-5 cursor-pointer accent-op-ink"
                            />
                            Done
                          </label>
                          {item.hasNotes && (
                            <button
                              type="button"
                              onClick={() => setSelectedId(item.open ? "none" : item.id)}
                              aria-expanded={item.open}
                              className="min-h-11 flex-1 cursor-pointer rounded-xl border-2 border-op-ink bg-op-ink px-3.5 text-[15px] font-bold text-op-cream sm:flex-none"
                            >
                              {item.open ? "Hide details" : "Details"}
                            </button>
                          )}
                        </div>
                      </div>
                      {item.open && item.hasNotes && <TeacherNotes text={item.tooltipText} />}
                    </article>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      <footer className="border-t-[3px] border-op-ink bg-op-ink text-op-cream">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-4 py-6 text-sm sm:px-6">
          <span>
            <strong className="font-display font-extrabold">
              onpace<span className="text-op-coral">.</span>
            </strong>{" "}
            · Times shown in Brisbane time (AEST)
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
