import { type DayNumber, fromParts, monthName, parts, weekday } from './date';

/** A linear map from day numbers (may be fractional) to pixels. */
export interface TimeScale {
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
  readonly pxPerDay: number;
  x(day: number): number;
  invert(px: number): number;
}

export function createScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): TimeScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (!(d1 > d0)) throw new RangeError('Domain must have positive length');
  const k = (r1 - r0) / (d1 - d0);
  return {
    domain,
    range,
    pxPerDay: k,
    x: (day) => r0 + (day - d0) * k,
    invert: (px) => d0 + (px - r0) / k,
  };
}

export type TickUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

const UNIT_DAYS: Record<TickUnit, number> = {
  day: 1,
  week: 7,
  month: 30.44,
  quarter: 91.31,
  year: 365.25,
};

const UNITS: TickUnit[] = ['day', 'week', 'month', 'quarter', 'year'];

/** The finest unit whose ticks stay at least `minSpacingPx` apart. */
export function chooseTickUnit(pxPerDay: number, minSpacingPx = 64): TickUnit {
  for (const unit of UNITS) {
    if (UNIT_DAYS[unit] * pxPerDay >= minSpacingPx) return unit;
  }
  return 'year';
}

export interface Tick {
  day: DayNumber;
  label: string;
  /** Major ticks start a larger period (a new month, a new year) and get a stronger line. */
  major: boolean;
}

function monthStart(day: DayNumber): { year: number; month: number } {
  const p = parts(day);
  return { year: p.year, month: p.month };
}

/** Ticks inside the visible domain, aligned to calendar boundaries. */
export function generateTicks(scale: TimeScale, unit: TickUnit): Tick[] {
  const [d0, d1] = scale.domain;
  const first = Math.ceil(d0);
  const last = Math.floor(d1);
  const ticks: Tick[] = [];

  if (unit === 'day' || unit === 'week') {
    // Weeks start on Monday (ISO 8601).
    let day = unit === 'day' ? first : first + ((1 - weekday(first) + 7) % 7);
    const step = unit === 'day' ? 1 : 7;
    for (; day <= last; day += step) {
      const p = parts(day);
      const major = unit === 'day' ? p.day === 1 : p.day <= 7;
      const label =
        unit === 'day'
          ? p.day === 1
            ? `${monthName(p.month)} 1`
            : String(p.day)
          : `${monthName(p.month)} ${p.day}`;
      ticks.push({ day, label, major });
    }
    return ticks;
  }

  const stepMonths = unit === 'month' ? 1 : unit === 'quarter' ? 3 : 12;
  let { year, month } = monthStart(first);
  // Snap to the start of the period that contains `first`.
  month = Math.floor((month - 1) / stepMonths) * stepMonths + 1;
  for (;;) {
    const day = fromParts(year, month, 1);
    if (day > last) break;
    if (day >= first) {
      const label =
        unit === 'year'
          ? String(year)
          : unit === 'quarter'
            ? `Q${(month - 1) / 3 + 1} ${year}`
            : month === 1
              ? `${monthName(month)} ${year}`
              : monthName(month);
      ticks.push({ day, label, major: month === 1 });
    }
    month += stepMonths;
    if (month > 12) {
      month -= 12;
      year += 1;
    }
  }
  return ticks;
}
