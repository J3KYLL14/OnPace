"use client";

import { useEffect, useRef, useState } from "react";
import { getProgressPercent, getPointPercent, getDaysRemaining, isOverdue } from "@/lib/pacing";
import { ThemeToggle } from "@/components/theme-toggle";

interface Props {
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
    label: string;
    internalDate: string;
    displayOrder: number;
    position: "above" | "below" | "auto";
    isKeyLabel: boolean;
    tooltipText: string | null;
  }[];
  serverTime: string;
}

export function PaceboardTimeline({ task, route, scaffoldPoints, serverTime }: Props) {
  const [now, setNow] = useState(() => new Date(serverTime));

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const startDate = new Date(task.startDate);
  const dueDate = new Date(task.dueDate);
  const progress = getProgressPercent(startDate, dueDate, now);
  const daysLeft = getDaysRemaining(dueDate, now);
  const overdue = isOverdue(dueDate, now);

  const BASE_OFFSET = 48;
  const TIER_STEP = 36;
  const OVERLAP_THRESHOLD = 10;    // percent closeness for scaffold-vs-scaffold
  const NOW_OVERLAP_THRESHOLD = 14; // slightly wider zone around NOW

  const rawPoints = scaffoldPoints.map((sp, i) => {
    const percent = getPointPercent(startDate, dueDate, new Date(sp.internalDate));
    const resolvedPosition =
      sp.position === "auto" ? (i % 2 === 0 ? "above" : "below") : sp.position;
    const isPast = percent < progress;
    return { ...sp, percent, resolvedPosition, isPast, tier: 0 };
  });

  // NOW is injected as a virtual point at the front so it always claims tier 0.
  // Any scaffold label that overlaps it on the "below" side gets bumped naturally.
  const nowVirtual = {
    label: "__NOW__",
    percent: progress,
    resolvedPosition: "below" as const,
    isKeyLabel: true,
    isPast: false,
    tier: 0,
    internalDate: "",
    displayOrder: -1,
    position: "below" as const,
    tooltipText: null as string | null,
  };

  const allForTier = [nowVirtual, ...rawPoints];

  const allWithTiers = allForTier.map((point, i) => {
    if (!point.isKeyLabel) return point;
    let tier = 0;
    for (let j = 0; j < i; j++) {
      const other = allForTier[j];
      if (!other.isKeyLabel) continue;
      if (other.resolvedPosition !== point.resolvedPosition) continue;
      const threshold = j === 0 ? NOW_OVERLAP_THRESHOLD : OVERLAP_THRESHOLD;
      if (Math.abs(other.percent - point.percent) < threshold) {
        tier = Math.max(tier, other.tier + 1);
      }
    }
    point.tier = tier;
    return point;
  });

  const nowTier = allWithTiers[0].tier; // NOW is always first
  const points = allWithTiers.slice(1);  // scaffold points with tiers calculated

  // Tooltip visibility — stays open for 800ms after mouse leaves so users can move to links
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openTooltip(idx: number) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActiveTooltip(idx);
  }
  function scheduleClose() {
    hideTimer.current = setTimeout(() => setActiveTooltip(null), 800);
  }

  // Render a line of text with any embedded URLs turned into clickable links
  function renderLine(line: string, key: number) {
    const parts = line.split(/(https?:\/\/[^\s]+)/g);
    return (
      <p key={key} className="leading-snug">
        {parts.map((part, pi) =>
          /^https?:\/\//.test(part) ? (
            <a
              key={pi}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bh-teal-dim dark:text-bh-teal hover:underline break-all"
            >
              🔗 {part}
            </a>
          ) : (
            part
          )
        )}
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-bh-black flex flex-col">
      {/* Header */}
      <header className="bg-bh-charcoal px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <ThemeToggle className="absolute top-4 right-4 text-white/40 hover:text-white/70 z-20" />
            <div>
              <div className="text-sm text-white/60 mb-1">
                {route.yearLevel} — {route.subject}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {task.title}
              </h1>
              {task.description && (
                <p className="text-white/70 mt-1 text-sm">{task.description}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-4" suppressHydrationWarning>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  overdue ? "text-red-400" : "text-white"
                }`}
                suppressHydrationWarning
              >
                {overdue ? "OVERDUE" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
              </div>
              <div className="text-sm text-white/60" suppressHydrationWarning>
                {overdue ? "past due" : "remaining"}
              </div>
              <div className={`text-sm font-medium mt-1 ${overdue ? "text-red-400" : "text-bh-teal"}`}>
                Due {dueDate.toLocaleDateString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <div className="flex-1 flex items-center px-6 py-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="relative" style={{ height: "280px" }}>
            {/* Central horizontal line (future portion - grey) */}
            <div
              className="absolute left-0 right-0 bg-gray-300 dark:bg-bh-surface"
              style={{ top: "50%", height: "3px", transform: "translateY(-50%)" }}
            />

            {/* Completed portion of line (past - red) */}
            <div
              className="absolute left-0 bg-red-400"
              style={{
                top: "50%",
                height: "3px",
                transform: "translateY(-50%)",
                width: `${Math.min(progress, 100)}%`,
              }}
              suppressHydrationWarning
            />

            {/* Start marker */}
            <div
              className="absolute flex flex-col items-center"
              style={{ left: "0%", top: "50%", transform: "translate(-50%, -50%)" }}
            >
              <div className="w-3 h-3 rounded-full bg-red-400" />
            </div>

            {/* Due date end marker */}
            <div
              className="absolute flex flex-col items-center"
              style={{ left: "100%", top: "50%", transform: "translate(-50%, -50%)" }}
            >
              <div
                className={`w-4 h-4 rounded-full border-3 ${
                  overdue ? "bg-red-600 border-red-600" : "bg-white border-gray-800 dark:border-gray-300"
                }`}
              />
            </div>

            {/* All scaffold ticks (z-index 1 — always behind labels) */}
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
              {points.map((point, i) => {
                const isAbove = point.resolvedPosition === "above";
                const nearCurrent = Math.abs(point.percent - progress) < 8;

                return (
                  <div
                    key={`tick-${i}`}
                    className="absolute"
                    style={{
                      left: `${point.percent}%`,
                      top: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    {/* Tick mark — extends to reach the tag */}
                    <div
                      className={`absolute left-1/2 ${
                        point.isPast ? "bg-red-300" : "bg-gray-400 dark:bg-gray-500"
                      }`}
                      style={{
                        width: "2px",
                        height: point.isKeyLabel
                          ? `${BASE_OFFSET + point.tier * TIER_STEP}px`
                          : "8px",
                        transform: `translateX(-50%) translateY(${isAbove ? "-100%" : "0"})`,
                        top: isAbove ? "-1px" : "1px",
                      }}
                    />

                    {/* Dot on the line */}
                    <div
                      className={`absolute left-1/2 w-2.5 h-2.5 rounded-full ${
                        point.isPast ? "bg-red-400" : nearCurrent ? "bg-gray-900 dark:bg-white" : "bg-gray-500 dark:bg-gray-400"
                      }`}
                      style={{
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* All scaffold labels (z-index 5 — always on top of ticks) */}
            <div className="absolute inset-0" style={{ zIndex: 5 }}>
              {points.map((point, i) => {
                if (!point.isKeyLabel) return null;
                const isAbove = point.resolvedPosition === "above";
                const nearCurrent = Math.abs(point.percent - progress) < 8;

                return (
                  <div
                    key={`label-${i}`}
                    className="absolute"
                    style={{
                      left: `${point.percent}%`,
                      top: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div
                      className="absolute left-1/2 text-center whitespace-nowrap"
                      style={{
                        transform: "translateX(-50%)",
                        ...(isAbove
                          ? { bottom: `${BASE_OFFSET + point.tier * TIER_STEP}px` }
                          : { top: `${BASE_OFFSET + point.tier * TIER_STEP}px` }),
                      }}
                    >
                      <span
                        onMouseEnter={() => point.tooltipText && openTooltip(i)}
                        onMouseLeave={() => point.tooltipText && scheduleClose()}
                        className={`inline-block px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium border ${
                          point.tooltipText ? "cursor-help" : ""
                        } ${
                          point.isPast
                            ? "bg-red-100 dark:bg-red-950 text-red-500 dark:text-red-400 border-red-300 dark:border-red-800"
                            : nearCurrent
                            ? "bg-bh-charcoal dark:bg-bh-teal text-bh-teal dark:text-bh-black border-bh-teal font-semibold"
                            : "bg-white dark:bg-bh-dark text-gray-600 dark:text-bh-muted border-gray-300 dark:border-bh-surface"
                        }`}
                      >
                        {point.label}
                        {point.tooltipText && (
                          <span className="ml-1 opacity-50 text-xs">ⓘ</span>
                        )}
                      </span>

                      {/* Tooltip — stays open 800ms after mouse leaves so users can click links */}
                      {point.tooltipText && activeTooltip === i && (
                        <div
                          onMouseEnter={() => openTooltip(i)}
                          onMouseLeave={scheduleClose}
                          className={`absolute z-50 p-3 rounded-lg shadow-xl border text-left whitespace-normal bg-white dark:bg-bh-dark border-gray-200 dark:border-bh-surface ${
                            isAbove ? "bottom-full mb-2" : "top-full mt-2"
                          }`}
                          style={{
                            minWidth: "220px",
                            maxWidth: "min(360px, 90vw)",
                            width: "max-content",
                            // Smart edge alignment: left-align near right edge, right-align near left edge, centre otherwise
                            ...(point.percent > 75
                              ? { right: 0 }
                              : point.percent < 25
                              ? { left: 0 }
                              : { left: "50%", transform: "translateX(-50%)" }),
                          }}
                        >
                          <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1.5">
                            {point.tooltipText.split("\n").map((line, li) =>
                              renderLine(line, li)
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current time redline marker — clamped to 100% when overdue so it never goes off-screen */}
            <div
              className="absolute"
              style={{
                left: `${Math.min(progress, 100)}%`,
                top: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
              }}
              suppressHydrationWarning
            >
              <div
                className={`absolute left-1/2 ${overdue ? "bg-red-600" : "bg-red-500"}`}
                style={{
                  width: "3px",
                  height: "80px",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className={`absolute left-1/2 w-3 h-3 rounded-full ${
                  overdue ? "bg-red-600" : "bg-red-500"
                }`}
                style={{
                  transform: "translate(-50%, -50%)",
                }}
              />
              {/* "NOW" label — participates in tier system, always has priority (tier 0 unless scaffold labels push it) */}
              <div
                className="absolute left-1/2 z-20"
                style={{
                  transform: "translateX(-50%)",
                  top: `${BASE_OFFSET + nowTier * TIER_STEP}px`,
                }}
              >
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${
                    overdue
                      ? "bg-red-600 text-white border-red-700"
                      : "bg-red-500 text-white border-red-600"
                  }`}
                >
                  NOW
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar below */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-bh-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  overdue ? "bg-red-500" : "bg-red-400"
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
                suppressHydrationWarning
              />
            </div>
            <span
              className={`text-sm font-medium ${overdue ? "text-red-600" : "text-gray-600 dark:text-gray-400"}`}
              suppressHydrationWarning
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-bh-surface bg-white dark:bg-bh-charcoal px-6 py-3">
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
