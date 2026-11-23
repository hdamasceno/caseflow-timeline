import { describe, expect, it } from 'vitest';
import { fromDayNumber, toDayNumber } from './date';
import { chooseTickUnit, createScale, generateTicks } from './scale';

describe('createScale', () => {
  const s = createScale([100, 200], [0, 1000]);

  it('maps and inverts linearly', () => {
    expect(s.pxPerDay).toBe(10);
    expect(s.x(150)).toBe(500);
    expect(s.invert(250)).toBe(125);
    expect(s.invert(s.x(173.25))).toBeCloseTo(173.25);
  });

  it('rejects an empty domain', () => {
    expect(() => createScale([5, 5], [0, 100])).toThrow(RangeError);
  });
});

describe('chooseTickUnit', () => {
  it.each([
    [80, 'day'],
    [10, 'week'],
    [3, 'month'],
    [0.8, 'quarter'],
    [0.2, 'year'],
    [0.01, 'year'],
  ] as const)('%s px/day -> %s', (pxPerDay, unit) => {
    expect(chooseTickUnit(pxPerDay)).toBe(unit);
  });
});

const range = (a: string, b: string) => createScale([toDayNumber(a), toDayNumber(b)], [0, 1000]);
const dates = (ticks: { day: number }[]) => ticks.map((t) => fromDayNumber(t.day));

describe('generateTicks', () => {
  it('puts week ticks on Mondays', () => {
    const ticks = generateTicks(range('2026-04-29', '2026-05-20'), 'week');
    expect(dates(ticks)).toEqual(['2026-05-04', '2026-05-11', '2026-05-18']);
    expect(ticks[0]).toMatchObject({ label: 'May 4', major: true });
  });

  it('labels day ticks and marks the first of the month', () => {
    const ticks = generateTicks(range('2026-04-29', '2026-05-02'), 'day');
    expect(ticks.map((t) => t.label)).toEqual(['29', '30', 'May 1', '2']);
    expect(ticks.filter((t) => t.major).map((t) => t.label)).toEqual(['May 1']);
  });

  it('puts month ticks on the 1st and labels January with the year', () => {
    const ticks = generateTicks(range('2025-11-15', '2026-03-10'), 'month');
    expect(ticks.map((t) => t.label)).toEqual(['Dec', 'Jan 2026', 'Feb', 'Mar']);
    expect(ticks.find((t) => t.major)?.label).toBe('Jan 2026');
  });

  it('aligns quarters and years', () => {
    expect(generateTicks(range('2025-08-01', '2026-08-01'), 'quarter').map((t) => t.label)).toEqual([
      'Q4 2025',
      'Q1 2026',
      'Q2 2026',
      'Q3 2026',
    ]);
    expect(generateTicks(range('2024-06-01', '2027-02-01'), 'year').map((t) => t.label)).toEqual([
      '2025',
      '2026',
      '2027',
    ]);
  });

  it('never returns ticks outside the domain', () => {
    const s = createScale([toDayNumber('2026-01-01') + 0.5, toDayNumber('2026-12-31') - 0.5], [0, 800]);
    for (const unit of ['day', 'week', 'month', 'quarter', 'year'] as const) {
      for (const t of generateTicks(s, unit)) {
        expect(t.day).toBeGreaterThanOrEqual(s.domain[0]);
        expect(t.day).toBeLessThanOrEqual(s.domain[1]);
      }
    }
  });
});
