import { DateTime } from 'luxon';
import { FAMILY_TIMEZONE } from './constants';

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

export function familyNow(): DateTime {
  return DateTime.now().setZone(FAMILY_TIMEZONE);
}

export function familyToday(): string {
  return familyNow().toISODate()!;
}

export function familyTodayAsDate(): Date {
  const { year, month, day } = familyNow();
  return new Date(year, month - 1, day);
}
