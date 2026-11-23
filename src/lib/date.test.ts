import { describe, expect, it } from 'vitest';
import {
  Weekday,
  addDays,
  daysInMonth,
  formatIso,
  fromDayNumber,
  isValidIso,
  nthWeekdayOfMonth,
  toDayNumber,
  todayIso,
  weekday,
} from './date';

describe('date', () => {
  it('round-trips ISO dates through day numbers', () => {
    expect(toDayNumber('1970-01-01')).toBe(0);
    expect(fromDayNumber(toDayNumber('2024-02-29'))).toBe('2024-02-29');
    expect(fromDayNumber(-1)).toBe('1969-12-31');
  });

  it('rejects malformed and impossible dates', () => {
    for (const bad of ['2025-02-29', '2025-13-01', '2025-1-01', '2025-04-31', 'nope', '2025-00-10']) {
      expect(isValidIso(bad)).toBe(false);
      expect(() => toDayNumber(bad)).toThrow(RangeError);
    }
    expect(isValidIso('2024-02-29')).toBe(true);
  });

  it('computes weekdays, including before the epoch', () => {
    expect(weekday(toDayNumber('1970-01-01'))).toBe(Weekday.Thu);
    expect(weekday(toDayNumber('2026-05-04'))).toBe(Weekday.Mon);
    expect(weekday(toDayNumber('1969-12-28'))).toBe(Weekday.Sun);
  });

  it('adds days across month and leap-year boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it('finds the n-th and last weekday of a month', () => {
    expect(fromDayNumber(nthWeekdayOfMonth(2025, 11, Weekday.Thu, 4))).toBe('2025-11-27');
    expect(fromDayNumber(nthWeekdayOfMonth(2026, 5, Weekday.Mon, -1))).toBe('2026-05-25');
    expect(fromDayNumber(nthWeekdayOfMonth(2026, 9, Weekday.Mon, 1))).toBe('2026-09-07');
    expect(() => nthWeekdayOfMonth(2026, 2, Weekday.Mon, 5)).toThrow(RangeError);
    expect(() => nthWeekdayOfMonth(2026, 2, Weekday.Mon, 0)).toThrow(RangeError);
  });

  it('formats without depending on the locale', () => {
    expect(formatIso('2026-03-02')).toBe('Mar 2, 2026');
  });

  it('uses the local calendar day for "today"', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
