import { describe, expect, it } from 'vitest';
import { type Interval, maxOverlap, packLanes } from './layout';

const iv = (id: string, start: number, end: number): Interval => ({ id, start, end });

function overlapsInLane(items: Interval[], lane: Record<string, number>, gap: number): boolean {
  return items.some((a) =>
    items.some(
      (b) => a !== b && lane[a.id] === lane[b.id] && a.start < b.end + gap && b.start < a.end + gap,
    ),
  );
}

describe('packLanes', () => {
  it('reuses a lane once the previous interval has ended', () => {
    const { lane, laneCount } = packLanes([iv('a', 0, 5), iv('b', 5, 9), iv('c', 2, 7)]);
    expect(laneCount).toBe(2);
    expect(lane).toEqual({ a: 0, c: 1, b: 0 });
  });

  it('respects the gap', () => {
    expect(packLanes([iv('a', 0, 5), iv('b', 5, 9)], 1).laneCount).toBe(2);
    expect(packLanes([iv('a', 0, 5), iv('b', 6, 9)], 1).laneCount).toBe(1);
  });

  it('is stable regardless of input order', () => {
    const items = [iv('x', 3, 8), iv('y', 0, 4), iv('z', 3, 8)];
    expect(packLanes(items)).toEqual(packLanes([...items].reverse()));
  });

  it('rejects intervals that end before they start', () => {
    expect(() => packLanes([iv('bad', 5, 1)])).toThrow(RangeError);
  });

  it('is optimal and collision-free on random input', () => {
    // A small deterministic PRNG so failures are reproducible.
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let round = 0; round < 200; round += 1) {
      const items = Array.from({ length: 1 + Math.floor(rand() * 25) }, (_, i) => {
        const start = Math.floor(rand() * 100);
        return iv(`i${i}`, start, start + 1 + Math.floor(rand() * 30));
      });
      const { lane, laneCount } = packLanes(items);
      expect(overlapsInLane(items, lane, 0)).toBe(false);
      expect(laneCount).toBe(maxOverlap(items));
    }
  });
});

describe('maxOverlap', () => {
  it('treats intervals as half-open', () => {
    expect(maxOverlap([iv('a', 0, 5), iv('b', 5, 10)])).toBe(1);
    expect(maxOverlap([iv('a', 0, 6), iv('b', 5, 10), iv('c', 5, 7)])).toBe(3);
    expect(maxOverlap([])).toBe(0);
  });
});
