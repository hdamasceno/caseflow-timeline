import { describe, expect, it } from 'vitest';
import { fromDayNumber } from '../lib/date';
import { BusinessCalendar } from '../lib/holidays';
import { type CaseDef, describeItem, resolveCase } from './case';
import { DEMO_TODAY, demoCase } from './demoCase';

const cal = new BusinessCalendar();

const tiny: CaseDef = {
  id: 't',
  title: 't',
  subtitle: '',
  phases: [
    { id: 'past', label: 'Past', start: '2026-01-01', end: '2026-02-01' },
    { id: 'now', label: 'Now', start: '2026-04-01' },
    { id: 'later', label: 'Later', start: '2026-06-01', end: '2026-07-01' },
  ],
  milestones: [{ id: 'm', label: 'Kick-off', date: '2026-04-01' }],
  deadlines: [{ id: 'd', label: 'Reply', anchor: 'm', rule: { kind: 'business-days', days: 10 } }],
};

describe('resolveCase', () => {
  it('derives phase status from today', () => {
    const items = resolveCase(tiny, '2026-05-04', cal);
    const status = Object.fromEntries(items.filter((i) => i.type === 'phase').map((p) => [p.id, p.status]));
    expect(status).toEqual({ past: 'done', now: 'active', later: 'planned' });
  });

  it('extends an ongoing phase to today', () => {
    const now = resolveCase(tiny, '2026-05-04', cal).find((i) => i.id === 'now');
    expect(now?.type === 'phase' && fromDayNumber(now.end)).toBe('2026-05-05');
  });

  it('resolves deadline dates through the business calendar', () => {
    const d = resolveCase(tiny, '2026-04-01', cal).find((i) => i.id === 'd');
    expect(d).toMatchObject({ type: 'deadline', status: 'upcoming', ruleText: '10 business days' });
    expect(d && d.type === 'deadline' && fromDayNumber(d.day)).toBe('2026-04-15');
  });

  it('accepts an ad-hoc anchor date', () => {
    const def = { ...tiny, deadlines: [{ id: 'x', label: 'X', anchor: { date: '2026-11-25', label: 'Nov 25' }, rule: { kind: 'business-days' as const, days: 1 } }] };
    const x = resolveCase(def, '2026-11-01', cal).find((i) => i.id === 'x');
    expect(x && x.type === 'deadline' && x.skippedHolidays).toEqual(['Thanksgiving Day']);
  });

  it('fails loudly on a broken anchor reference', () => {
    const def = { ...tiny, deadlines: [{ ...tiny.deadlines[0]!, anchor: 'missing' }] };
    expect(() => resolveCase(def, '2026-05-04', cal)).toThrow(/unknown milestone/);
  });

  it('returns items sorted by start date', () => {
    const items = resolveCase(demoCase, DEMO_TODAY, cal);
    const starts = items.map((i) => (i.type === 'phase' ? i.start : i.day));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('gives the demo case every deadline status', () => {
    const statuses = new Set(
      resolveCase(demoCase, DEMO_TODAY, cal).flatMap((i) => (i.type === 'deadline' ? [i.status] : [])),
    );
    expect([...statuses].sort()).toEqual(['due-soon', 'met', 'overdue', 'upcoming']);
  });

  it('describes items for assistive tech', () => {
    const items = resolveCase(tiny, '2026-05-04', cal);
    expect(describeItem(items.find((i) => i.id === 'past')!)).toBe(
      'Phase Past, Jan 1, 2026 to Jan 31, 2026, done',
    );
    expect(describeItem(items.find((i) => i.id === 'now')!)).toBe('Phase Now, Apr 1, 2026 ongoing, in progress');
  });
});
