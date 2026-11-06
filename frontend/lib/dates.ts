const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-10" -> "Nov 10". Reads the string directly, so time zones can't shift the day. */
export function formatDay(isoDate: string): string {
  const [, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Nov 10 – Nov 12", or just "Nov 10" for a one-day rental. */
export function formatRange(start: string, end: string): string {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

/** Both days count: Fri to Sun is 3 days. */
export function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}
