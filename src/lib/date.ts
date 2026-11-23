/**
 * Calendar dates as plain `YYYY-MM-DD` strings and integer "day numbers"
 * (days since 1970-01-01, UTC). Working in whole UTC days keeps every
 * calculation free of time zones and daylight-saving jumps.
 */
export type IsoDate = string;

/** Days since the Unix epoch. 0 is 1970-01-01. */
export type DayNumber = number;

export const MS_PER_DAY = 86_400_000;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const Weekday = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export function isValidIso(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

export function toDayNumber(iso: IsoDate): DayNumber {
  const m = ISO_RE.exec(iso);
  if (!m || !isValidIso(iso)) {
    throw new RangeError(`Invalid ISO date: "${iso}"`);
  }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

export function fromDayNumber(day: DayNumber): IsoDate {
  return new Date(Math.floor(day) * MS_PER_DAY).toISOString().slice(0, 10);
}

export function fromParts(year: number, month: number, day: number): DayNumber {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function parts(day: DayNumber): { year: number; month: number; day: number } {
  const d = new Date(Math.floor(day) * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday. */
export function weekday(day: DayNumber): Weekday {
  return ((((Math.floor(day) + 4) % 7) + 7) % 7) as Weekday;
}

export function isWeekend(day: DayNumber): boolean {
  const w = weekday(day);
  return w === Weekday.Sat || w === Weekday.Sun;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(iso) + days);
}

/**
 * The n-th given weekday of a month. `n = -1` means the last one.
 * Example: Thanksgiving is `nthWeekdayOfMonth(year, 11, Weekday.Thu, 4)`.
 */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  wd: Weekday,
  n: number,
): DayNumber {
  if (n === 0 || n > 5 || n < -1) throw new RangeError(`n must be 1..5 or -1, got ${n}`);
  if (n === -1) {
    const last = fromParts(year, month, daysInMonth(year, month));
    return last - ((weekday(last) - wd + 7) % 7);
  }
  const first = fromParts(year, month, 1);
  const result = first + ((wd - weekday(first) + 7) % 7) + (n - 1) * 7;
  if (parts(result).month !== month) {
    throw new RangeError(`Month ${year}-${month} has no occurrence #${n} of weekday ${wd}`);
  }
  return result;
}

export function monthName(month: number): string {
  const name = MONTHS[month - 1];
  if (!name) throw new RangeError(`Invalid month ${month}`);
  return name;
}

/** Locale-independent "Mar 2, 2026" so output is identical in every environment. */
export function formatDay(day: DayNumber): string {
  const p = parts(day);
  return `${monthName(p.month)} ${p.day}, ${p.year}`;
}

export function formatIso(iso: IsoDate): string {
  return formatDay(toDayNumber(iso));
}

export function todayIso(now: Date = new Date()): IsoDate {
  // Use the viewer's local calendar day, not the UTC one.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
