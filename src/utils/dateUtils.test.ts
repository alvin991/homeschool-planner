import { describe, it, expect } from 'vitest';
import { monthToDateRange, shiftMonth } from './dateUtils';

describe('monthToDateRange', () => {
  it('handles a normal 30-day month', () => {
    expect(monthToDateRange('2026-09')).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
  });

  it('handles a 31-day month', () => {
    expect(monthToDateRange('2026-01')).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
  });

  it('handles February in a non-leap year', () => {
    expect(monthToDateRange('2026-02')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });

  it('handles February in a leap year', () => {
    expect(monthToDateRange('2028-02')).toEqual({
      startDate: '2028-02-01',
      endDate: '2028-02-29',
    });
  });

  it('handles December without rolling into next year', () => {
    expect(monthToDateRange('2026-12')).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
  });
});

describe('shiftMonth', () => {
  it('shifts forward within a year', () => {
    expect(shiftMonth('2026-06', 1)).toBe('2026-07');
  });

  it('shifts backward across a year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});
