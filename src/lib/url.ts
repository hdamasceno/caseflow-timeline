import { type IsoDate, isValidIso } from './date';

/** Reads `?today=YYYY-MM-DD`, used to pin the demo to a fixed day (screenshots, e2e). */
export function readTodayFromUrl(search: string): IsoDate | undefined {
  const v = new URLSearchParams(search).get('today');
  return v && isValidIso(v) ? v : undefined;
}
