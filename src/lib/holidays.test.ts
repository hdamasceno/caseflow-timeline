import { describe, expect, it } from 'vitest';
import { toDayNumber } from './date';
import { BusinessCalendar, federalHolidays } from './holidays';

const observed = (year: number) => federalHolidays(year).map((h) => h.observed);

describe('federalHolidays', () => {
  it('matches the published 2026 schedule', () => {
    expect(observed(2026)).toEqual([
      '2026-01-01',
      '2026-01-19',
      '2026-02-16',
      '2026-05-25',
      '2026-06-19',
      '2026-07-03', // July 4 is a Saturday
      '2026-09-07',
      '2026-10-12',
      '2026-11-11',
      '2026-11-26',
      '2026-12-25',
    ]);
  });

  it('moves Sunday holidays to Monday', () => {
    const h2027 = federalHolidays(2027);
    const christmas = h2027.find((h) => h.name === 'Christmas Day');
    // Dec 25, 2027 is a Saturday -> Friday Dec 24.
    expect(christmas?.observed).toBe('2027-12-24');
    const juneteenth2022 = federalHolidays(2022).find((h) => h.name.startsWith('Juneteenth'));
    expect(juneteenth2022).toMatchObject({ actual: '2022-06-19', observed: '2022-06-20' });
  });

  it('only includes Juneteenth from 2021', () => {
    expect(federalHolidays(2020).some((h) => h.name.startsWith('Juneteenth'))).toBe(false);
    expect(federalHolidays(2021).some((h) => h.name.startsWith('Juneteenth'))).toBe(true);
  });
});

describe('BusinessCalendar', () => {
  const cal = new BusinessCalendar([{ date: '2026-12-24', name: 'Office closed' }]);

  it('treats weekends, holidays and closures as non-business days', () => {
    expect(cal.reason(toDayNumber('2026-05-02'))).toEqual({ kind: 'weekend' });
    expect(cal.reason(toDayNumber('2026-05-25'))).toEqual({ kind: 'holiday', name: 'Memorial Day' });
    expect(cal.reason(toDayNumber('2026-12-24'))).toEqual({ kind: 'closure', name: 'Office closed' });
    expect(cal.isBusinessDay(toDayNumber('2026-05-26'))).toBe(true);
  });

  it("finds New Year's Day observed in the previous year", () => {
    // Jan 1, 2022 was a Saturday, so it was observed on Friday Dec 31, 2021.
    expect(cal.holidayName(toDayNumber('2021-12-31'))).toBe("New Year's Day");
    expect(cal.isBusinessDay(toDayNumber('2021-12-31'))).toBe(false);
  });
});
