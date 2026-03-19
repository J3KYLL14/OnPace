export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getProgressPercent(startDate: Date, dueDate: Date, now: Date = new Date()): number {
  const elapsed = now.getTime() - startDate.getTime();
  const total = dueDate.getTime() - startDate.getTime();
  if (total <= 0) return 100;
  return clamp((elapsed / total) * 100, 0, 100);
}

export function getPointPercent(startDate: Date, dueDate: Date, pointDate: Date): number {
  const total = dueDate.getTime() - startDate.getTime();
  if (total <= 0) return 100;
  const offset = pointDate.getTime() - startDate.getTime();
  return clamp((offset / total) * 100, 0, 100);
}

export function getDaysRemaining(dueDate: Date, now: Date = new Date()): number {
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: Date, now: Date = new Date()): boolean {
  return now.getTime() > dueDate.getTime();
}
