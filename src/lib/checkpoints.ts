// Helpers for the student-facing OnPace view.
// All day maths is done in school time (Brisbane) so the server render and the
// student's browser always agree on what "today" is.

export const SCHOOL_TZ = "Australia/Brisbane";
export const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Midnight (UTC-based) of the calendar day `d` falls on in school time. */
export function dayKey(d: Date): number {
  return Date.parse(dayKeyFmt.format(d)); // "2026-10-28" → UTC midnight
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((dayKey(to) - dayKey(from)) / DAY_MS);
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    timeZone: SCHOOL_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-AU", {
    timeZone: SCHOOL_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDay(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 1 ? `in ${days} days` : `${-days} days ago`;
}

/** Monday-based week markers between start and due, as positions on the track. */
export function weekMarkers(start: Date, due: Date) {
  const startDay = dayKey(start);
  const weekday = (new Date(startDay).getUTCDay() + 6) % 7; // Mon = 0
  const firstMonday = startDay - weekday * DAY_MS;
  const total = due.getTime() - start.getTime();
  const markers: { left: number; label: string }[] = [];
  if (total <= 0) return markers;

  for (let w = 0; ; w++) {
    // dayKey values are UTC midnights of the school-time date; shift to school
    // midnight (+10h is fine for Brisbane, which has no daylight saving)
    const monday = firstMonday + w * 7 * DAY_MS;
    if (monday > dayKey(due)) break;
    const schoolMidnight = monday - 10 * 60 * 60 * 1000;
    const left = ((schoolMidnight - start.getTime()) / total) * 100;
    if (left < 0) continue;
    const d = new Date(monday);
    markers.push({
      left: Math.min(100, left),
      label: `Wk ${w + 1} · ${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
    });
  }
  // Keep the track readable on long tasks
  if (markers.length > 9) return markers.filter((_, i) => i % 2 === 0);
  return markers;
}

/**
 * Teacher notes are free text. Lines containing a URL become link buttons,
 * using the rest of the line as the button label ("Brief template: https://…").
 */
export function parseNotes(text: string | null) {
  const paragraphs: string[] = [];
  const links: { label: string; url: string }[] = [];
  if (!text) return { paragraphs, links };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const urls = line.match(/https?:\/\/[^\s]+/g);
    if (!urls) {
      paragraphs.push(line);
      continue;
    }
    const rest = line
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/[\s:–—-]+$/u, "")
      .trim();
    const short = rest.length > 0 && rest.length <= 40;
    if (rest && !short) paragraphs.push(rest);
    urls.forEach((url, i) => {
      let label = short && i === 0 ? rest : "";
      if (!label) {
        try {
          label = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          label = "Open link";
        }
      }
      links.push({ label, url });
    });
  }
  return { paragraphs, links };
}

/* ------------------------------------------------------------------ */
/* Calendar (.ics) export                                              */
/* ------------------------------------------------------------------ */

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(d: Date) {
  return dayKeyFmt.format(d).replace(/-/g, "");
}

function icsStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(opts: {
  uidPrefix: string;
  taskTitle: string;
  dueDate: Date;
  events: { id: string; label: string; date: Date; notes: string | null }[];
}) {
  const stamp = icsStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OnPace//Student checkpoints//EN",
    "CALSCALE:GREGORIAN",
  ];
  const all = [...opts.events];
  if (!all.some((e) => dayKey(e.date) === dayKey(opts.dueDate))) {
    all.push({ id: "due", label: "Due", date: opts.dueDate, notes: null });
  }
  for (const e of all) {
    const start = icsDate(e.date);
    const end = icsDate(new Date(dayKey(e.date) + DAY_MS + 12 * 60 * 60 * 1000));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${opts.uidPrefix}-${e.id}@onpace`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(`${e.label} — ${opts.taskTitle}`)}`,
      ...(e.notes ? [`DESCRIPTION:${icsEscape(e.notes)}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Student ticks — stored only in this browser (localStorage)          */
/* ------------------------------------------------------------------ */

const TICKS_EVENT = "onpace:ticks";
export const ticksKey = (taskId: string) => `onpace:done:${taskId}`;

// Fallback for browsers where storage is blocked (private mode, school policy):
// ticks then last until the page is closed.
const memoryTicks = new Map<string, string>();

export function readTicksRaw(taskId: string): string | null {
  try {
    return window.localStorage.getItem(ticksKey(taskId)) ?? memoryTicks.get(taskId) ?? null;
  } catch {
    return memoryTicks.get(taskId) ?? null;
  }
}

export function parseTicks(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeTicks(taskId: string, ids: string[]) {
  const value = JSON.stringify(ids);
  memoryTicks.set(taskId, value);
  try {
    window.localStorage.setItem(ticksKey(taskId), value);
  } catch {
    // storage blocked — memoryTicks keeps it for this visit
  }
  window.dispatchEvent(new Event(TICKS_EVENT));
}

export function subscribeTicks(callback: () => void) {
  window.addEventListener("storage", callback); // other tabs
  window.addEventListener(TICKS_EVENT, callback); // this tab
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TICKS_EVENT, callback);
  };
}
