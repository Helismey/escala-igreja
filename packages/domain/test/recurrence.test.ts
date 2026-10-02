import { describe, it, expect } from 'vitest';
import { generateRecurrenceDates, formatISODateOnly } from '../src/scheduling/recurrence.js';

describe('Recurrence & Batch Programs Generator', () => {
  it('formats dates as YYYY-MM-DD correctly', () => {
    const d = new Date(Date.UTC(2026, 9, 3, 12, 0, 0)); // Oct 3, 2026
    expect(formatISODateOnly(d)).toBe('2026-10-03');
  });

  it('generates weekly dates for selected days of week', () => {
    // 2026-10-01 is a Thursday
    // Let's select Saturday (6) and Sunday (0) for 2 weeks
    const dates = generateRecurrenceDates({
      mode: 'WEEKLY_DAYS',
      weekdays: [0, 6], // Sunday, Saturday
      startDate: '2026-10-01',
      endDate: '2026-10-15',
    }).map(formatISODateOnly);

    // Saturdays: Oct 3, Oct 10
    // Sundays: Oct 4, Oct 11
    expect(dates).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('generates daily dates for a continuous range', () => {
    const dates = generateRecurrenceDates({
      mode: 'DAILY_RANGE',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    }).map(formatISODateOnly);

    expect(dates).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });

  it('respects maximum occurrences limit for safety', () => {
    // Range of 200 days with maxOccurrences 20
    const dates = generateRecurrenceDates({
      mode: 'DAILY_RANGE',
      startDate: '2026-01-01',
      endDate: '2026-07-01',
      maxOccurrences: 20,
    }).map(formatISODateOnly);

    expect(dates).toHaveLength(20);
    expect(dates[0]).toBe('2026-01-01');
    expect(dates[19]).toBe('2026-01-20');
  });

  it('returns empty array if startDate is after endDate', () => {
    const dates = generateRecurrenceDates({
      mode: 'DAILY_RANGE',
      startDate: '2026-10-10',
      endDate: '2026-10-01',
    });

    expect(dates).toEqual([]);
  });
});
