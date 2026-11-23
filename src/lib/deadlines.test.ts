import { describe, expect, it } from 'vitest';
import { computeDeadline, deadlineStatus, describeRule } from './deadlines';
import { BusinessCalendar } from './holidays';

const cal = new BusinessCalendar();

describe('computeDeadline: business days', () => {
  it('does not count the start day and skips weekends', () => {
    // Fri May 1 2026 + 1 business day = Mon May 4.
    const r = computeDeadline('2026-05-01', { kind: 'business-days', days: 1 }, cal);
    expect(r.due).toBe('2026-05-04');
    expect(r.skipped.map((s) => s.reason)).toEqual(['weekend', 'weekend']);
  });

  it('skips observed federal holidays', () => {
    // 5 business days from Wed Nov 25 2026 crosses Thanksgiving (Thu Nov 26).
    const r = computeDeadline('2026-11-25', { kind: 'business-days', days: 5 }, cal);
    expect(r.due).toBe('2026-12-03');
    expect(r.skipped.filter((s) => s.reason === 'holiday')).toEqual([
      { date: '2026-11-26', reason: 'holiday', name: 'Thanksgiving Day' },
    ]);
  });

  it('returns the start date for zero days', () => {
    expect(computeDeadline('2026-05-02', { kind: 'business-days', days: 0 }, cal).due).toBe('2026-05-02');
  });

  it('honours office closures', () => {
    const withClosure = new BusinessCalendar([{ date: '2026-05-05', name: 'Offsite' }]);
    const r = computeDeadline('2026-05-04', { kind: 'business-days', days: 1 }, withClosure);
    expect(r.due).toBe('2026-05-06');
    expect(r.skipped).toEqual([{ date: '2026-05-05', reason: 'closure', name: 'Offsite' }]);
  });
});

describe('computeDeadline: calendar days', () => {
  it('lands on the raw date when rolling is off', () => {
    const r = computeDeadline('2026-04-20', { kind: 'calendar-days', days: 12, rollForward: false }, cal);
    expect(r).toEqual({ due: '2026-05-02', skipped: [] });
  });

  it('rolls a Saturday landing to Monday', () => {
    // Apr 20 + 75 = Sat Jul 4 2026; Sat, Sun, then Monday is a normal day.
    // (The holiday is observed on Fri Jul 3, so it is not crossed.)
    const r = computeDeadline('2026-04-20', { kind: 'calendar-days', days: 75, rollForward: true }, cal);
    expect(r.due).toBe('2026-07-06');
    expect(r.rolledFrom).toBe('2026-07-04');
  });

  it('rolls off an observed holiday', () => {
    const r = computeDeadline('2026-06-26', { kind: 'calendar-days', days: 7, rollForward: true }, cal);
    expect(r.due).toBe('2026-07-06');
    expect(r.skipped.map((s) => s.date)).toEqual(['2026-07-03', '2026-07-04', '2026-07-05']);
  });

  it('does not set rolledFrom when no roll was needed', () => {
    const r = computeDeadline('2026-04-20', { kind: 'calendar-days', days: 87, rollForward: true }, cal);
    expect(r).toEqual({ due: '2026-07-16', skipped: [] });
  });
});

describe('computeDeadline: validation', () => {
  it.each([-1, 1.5, Number.NaN])('rejects days = %s', (days) => {
    expect(() => computeDeadline('2026-01-01', { kind: 'business-days', days }, cal)).toThrow(RangeError);
  });

  it('gives up instead of looping forever when no day is open', () => {
    const closed = Array.from({ length: 2000 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 2 + i)).toISOString().slice(0, 10),
      name: 'Closed',
    }));
    expect(() =>
      computeDeadline('2026-01-01', { kind: 'business-days', days: 1 }, new BusinessCalendar(closed)),
    ).toThrow(/No business days/);
  });
});

describe('deadlineStatus', () => {
  it('classifies relative to today', () => {
    expect(deadlineStatus('2026-05-01', '2026-05-04')).toBe('overdue');
    expect(deadlineStatus('2026-05-04', '2026-05-04')).toBe('due-soon');
    expect(deadlineStatus('2026-05-11', '2026-05-04')).toBe('due-soon');
    expect(deadlineStatus('2026-05-12', '2026-05-04')).toBe('upcoming');
    expect(deadlineStatus('2026-05-12', '2026-05-04', { warnWithinDays: 10 })).toBe('due-soon');
    expect(deadlineStatus('2026-01-01', '2026-05-04', { completedOn: '2025-12-30' })).toBe('met');
  });

  it('describes rules for people', () => {
    expect(describeRule({ kind: 'business-days', days: 1 })).toBe('1 business day');
    expect(describeRule({ kind: 'calendar-days', days: 87, rollForward: true })).toBe(
      '87 calendar days, next business day',
    );
  });
});
