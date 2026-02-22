/**
 * Date utilities for activity feed and date range filtering.
 */

/**
 * Format a date as relative time (e.g. "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

/**
 * Format date for display in activity list (e.g. "Feb 19, 2025, 3:45 PM").
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date for date range picker (YYYY-MM-DD).
 */
export function formatDateForPicker(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Start of day in UTC for a given date string (YYYY-MM-DD).
 */
export function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * End of day in UTC for a given date string (YYYY-MM-DD).
 */
export function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Check if a date is within a range [start, end] (inclusive).
 */
export function isDateInRange(
  date: Date | string,
  start: Date | string | null,
  end: Date | string | null
): boolean {
  if (!start && !end) return true;
  const d = typeof date === 'string' ? new Date(date) : date;
  const s = start ? (typeof start === 'string' ? new Date(start) : start) : null;
  const e = end ? (typeof end === 'string' ? new Date(end) : end) : null;
  if (s && d < s) return false;
  if (e && d > e) return false;
  return true;
}
