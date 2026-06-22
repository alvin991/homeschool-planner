/** Returns today's date as YYYY-MM-DD in the browser's local timezone. */
export function localToday(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function getDaysInCurrentMonth(): number {
  const today = new Date();
  const year = today.getFullYear();
  const nextMonth = today.getMonth() + 1;

  return new Date(year, nextMonth, 0).getDate();
}

export function getFirstWeekdayOfCurrentMonth(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  return new Date(year, month, 1).getDay();
}

/**
 * shiftMonth("2026-06", -1) → "2026-05"
 * @param month - "YYYY-MM" format, e.g. "2026-06"
 * @param delta - number of months to shift, e.g. -1 for prev, +1 for next
 */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
