import { type DayNumber, type IsoDate, fromDayNumber, toDayNumber } from './date';
import type { BusinessCalendar } from './holidays';

export type DeadlineRule =
  /** N calendar days after the start; optionally moved to the next business day. */
  | { kind: 'calendar-days'; days: number; rollForward: boolean }
  /** N business days after the start; the start day itself never counts. */
  | { kind: 'business-days'; days: number };

export interface SkippedDay {
  date: IsoDate;
  reason: 'weekend' | 'holiday' | 'closure';
  name?: string;
}

export interface DeadlineResult {
  due: IsoDate;
  /** Non-business days that pushed the date later. */
  skipped: SkippedDay[];
  /** For calendar rules that rolled forward: the raw date before rolling. */
  rolledFrom?: IsoDate;
}

/** A guard so a broken calendar (e.g. every day closed) cannot loop forever. */
const MAX_SCAN_DAYS = 366 * 5;

function assertDays(days: number): void {
  if (!Number.isInteger(days) || days < 0) {
    throw new RangeError(`days must be a non-negative integer, got ${days}`);
  }
}

function skippedDay(cal: BusinessCalendar, day: DayNumber): SkippedDay | undefined {
  const r = cal.reason(day);
  if (!r) return undefined;
  const base = { date: fromDayNumber(day), reason: r.kind };
  return r.kind === 'weekend' ? base : { ...base, name: r.name };
}

export function computeDeadline(
  start: IsoDate,
  rule: DeadlineRule,
  cal: BusinessCalendar,
): DeadlineResult {
  assertDays(rule.days);
  const startDay = toDayNumber(start);
  const skipped: SkippedDay[] = [];

  if (rule.kind === 'business-days') {
    let day = startDay;
    let counted = 0;
    let scanned = 0;
    while (counted < rule.days) {
      day += 1;
      if (++scanned > MAX_SCAN_DAYS) throw new Error('No business days found in range');
      const skip = skippedDay(cal, day);
      if (skip) skipped.push(skip);
      else counted += 1;
    }
    return { due: fromDayNumber(day), skipped };
  }

  const raw = startDay + rule.days;
  if (!rule.rollForward) return { due: fromDayNumber(raw), skipped };

  let day = raw;
  let scanned = 0;
  for (let skip = skippedDay(cal, day); skip; skip = skippedDay(cal, day)) {
    skipped.push(skip);
    day += 1;
    if (++scanned > MAX_SCAN_DAYS) throw new Error('No business days found in range');
  }
  return day === raw
    ? { due: fromDayNumber(day), skipped }
    : { due: fromDayNumber(day), skipped, rolledFrom: fromDayNumber(raw) };
}

export type DeadlineStatus = 'met' | 'overdue' | 'due-soon' | 'upcoming';

export function deadlineStatus(
  due: IsoDate,
  today: IsoDate,
  opts: { completedOn?: IsoDate; warnWithinDays?: number } = {},
): DeadlineStatus {
  const { completedOn, warnWithinDays = 7 } = opts;
  if (completedOn) return 'met';
  const left = toDayNumber(due) - toDayNumber(today);
  if (left < 0) return 'overdue';
  if (left <= warnWithinDays) return 'due-soon';
  return 'upcoming';
}

export function describeRule(rule: DeadlineRule): string {
  const plural = rule.days === 1 ? '' : 's';
  if (rule.kind === 'business-days') return `${rule.days} business day${plural}`;
  return `${rule.days} calendar day${plural}${rule.rollForward ? ', next business day' : ''}`;
}
