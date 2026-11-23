import {
  type DayNumber,
  type IsoDate,
  Weekday,
  fromDayNumber,
  fromParts,
  isWeekend,
  nthWeekdayOfMonth,
  parts,
  toDayNumber,
  weekday,
} from './date';

export interface Holiday {
  name: string;
  /** The legal date of the holiday. */
  actual: IsoDate;
  /** The weekday it is observed on (moved off Saturday/Sunday). */
  observed: IsoDate;
}

/**
 * US federal holidays (5 U.S.C. 6103) for one year.
 * A holiday on Saturday is observed the Friday before; on Sunday, the Monday after.
 * Juneteenth is included from 2021, the year it became a federal holiday.
 */
export function federalHolidays(year: number): Holiday[] {
  const fixed = (month: number, day: number) => fromParts(year, month, day);
  const list: Array<[string, DayNumber]> = [
    ["New Year's Day", fixed(1, 1)],
    ['Birthday of Martin Luther King, Jr.', nthWeekdayOfMonth(year, 1, Weekday.Mon, 3)],
    ["Washington's Birthday", nthWeekdayOfMonth(year, 2, Weekday.Mon, 3)],
    ['Memorial Day', nthWeekdayOfMonth(year, 5, Weekday.Mon, -1)],
    ...(year >= 2021 ? ([['Juneteenth National Independence Day', fixed(6, 19)]] as Array<[string, DayNumber]>) : []),
    ['Independence Day', fixed(7, 4)],
    ['Labor Day', nthWeekdayOfMonth(year, 9, Weekday.Mon, 1)],
    ['Columbus Day', nthWeekdayOfMonth(year, 10, Weekday.Mon, 2)],
    ['Veterans Day', fixed(11, 11)],
    ['Thanksgiving Day', nthWeekdayOfMonth(year, 11, Weekday.Thu, 4)],
    ['Christmas Day', fixed(12, 25)],
  ];
  return list.map(([name, day]) => ({
    name,
    actual: fromDayNumber(day),
    observed: fromDayNumber(observedDay(day)),
  }));
}

export function observedDay(day: DayNumber): DayNumber {
  const wd = weekday(day);
  if (wd === Weekday.Sat) return day - 1;
  if (wd === Weekday.Sun) return day + 1;
  return day;
}

export type NonBusinessReason =
  | { kind: 'weekend' }
  | { kind: 'holiday'; name: string }
  | { kind: 'closure'; name: string };

/**
 * Answers "is this a working day?" with weekends, observed federal holidays
 * and optional office closures. Holiday lists are built lazily per year and cached.
 */
export class BusinessCalendar {
  private readonly byYear = new Map<number, Map<DayNumber, string>>();
  private readonly closures: Map<DayNumber, string>;

  constructor(closures: ReadonlyArray<{ date: IsoDate; name: string }> = []) {
    this.closures = new Map(closures.map((c) => [toDayNumber(c.date), c.name]));
  }

  holidayName(day: DayNumber): string | undefined {
    // An observed date can fall in the previous year (Jan 1 on a Saturday is
    // observed on Dec 31), so look at the neighbouring year too.
    const { year } = parts(day);
    return this.yearMap(year).get(day) ?? this.yearMap(year + 1).get(day);
  }

  reason(day: DayNumber): NonBusinessReason | undefined {
    const closure = this.closures.get(day);
    if (closure) return { kind: 'closure', name: closure };
    if (isWeekend(day)) return { kind: 'weekend' };
    const holiday = this.holidayName(day);
    if (holiday) return { kind: 'holiday', name: holiday };
    return undefined;
  }

  isBusinessDay(day: DayNumber): boolean {
    return this.reason(day) === undefined;
  }

  private yearMap(year: number): Map<DayNumber, string> {
    let map = this.byYear.get(year);
    if (!map) {
      map = new Map(federalHolidays(year).map((h) => [toDayNumber(h.observed), h.name]));
      this.byYear.set(year, map);
    }
    return map;
  }
}
