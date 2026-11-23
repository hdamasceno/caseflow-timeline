export interface Interval {
  id: string;
  /** Inclusive start, in any unit (we use day numbers). */
  start: number;
  /** Exclusive end. Must be >= start. */
  end: number;
}

export interface LaneLayout {
  lane: Record<string, number>;
  laneCount: number;
}

/**
 * Assigns each interval to the lowest lane where it does not overlap another one.
 *
 * Intervals are visited by start (then by longer first, then id, so the result is
 * stable). Greedy first-fit in start order is optimal for interval graphs: it uses
 * exactly as many lanes as the largest number of intervals that overlap at one point.
 *
 * `gap` keeps a minimum distance between neighbours in the same lane, so labels
 * on bars do not touch.
 */
export function packLanes(items: readonly Interval[], gap = 0): LaneLayout {
  for (const it of items) {
    if (it.end < it.start) throw new RangeError(`Interval "${it.id}" ends before it starts`);
  }
  const order = [...items].sort(
    (a, b) => a.start - b.start || b.end - a.end || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const laneEnds: number[] = [];
  const lane: Record<string, number> = {};
  for (const it of order) {
    let idx = laneEnds.findIndex((end) => end + gap <= it.start);
    if (idx === -1) {
      idx = laneEnds.length;
      laneEnds.push(it.end);
    } else {
      laneEnds[idx] = it.end;
    }
    lane[it.id] = idx;
  }
  return { lane, laneCount: laneEnds.length };
}

/** The largest number of intervals that overlap at a single point (the lower bound on lanes). */
export function maxOverlap(items: readonly Interval[]): number {
  const events: Array<[number, number]> = [];
  for (const it of items) {
    if (it.end === it.start) continue;
    events.push([it.start, 1], [it.end, -1]);
  }
  // Ends sort before starts at the same point because intervals are half-open.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let best = items.some((it) => it.end === it.start) ? 1 : 0;
  for (const [, delta] of events) {
    cur += delta;
    best = Math.max(best, cur);
  }
  return best;
}
