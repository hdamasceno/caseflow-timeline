import { describe, expect, it } from 'vitest';
import { type ViewportLimits, clampViewport, panBy, reveal, span, zoomAt } from './viewport';

const limits: ViewportLimits = { minSpan: 10, maxSpan: 400, bounds: [0, 1000] };

describe('zoomAt', () => {
  it('keeps the anchor at the same relative position', () => {
    const vp = { start: 100, end: 300 };
    const next = zoomAt(vp, 2, 150, limits);
    expect(span(next)).toBe(100);
    // 150 was 25% into the old window and must stay 25% into the new one.
    expect((150 - next.start) / span(next)).toBeCloseTo(0.25);
  });

  it('clamps to the min and max span', () => {
    expect(span(zoomAt({ start: 0, end: 20 }, 100, 10, limits))).toBe(10);
    expect(span(zoomAt({ start: 0, end: 300 }, 0.01, 10, limits))).toBe(400);
  });

  it('stays inside the bounds when zooming out near an edge', () => {
    const next = zoomAt({ start: 900, end: 1000 }, 0.5, 990, limits);
    expect(next.end).toBeLessThanOrEqual(1000);
    expect(span(next)).toBe(200);
  });

  it('rejects a non-positive factor', () => {
    expect(() => zoomAt({ start: 0, end: 10 }, 0, 5, limits)).toThrow(RangeError);
  });
});

describe('panBy / clampViewport', () => {
  it('pans and stops at the bounds', () => {
    expect(panBy({ start: 100, end: 200 }, 50, limits)).toEqual({ start: 150, end: 250 });
    expect(panBy({ start: 100, end: 200 }, -500, limits)).toEqual({ start: 0, end: 100 });
    expect(panBy({ start: 100, end: 200 }, 5000, limits)).toEqual({ start: 900, end: 1000 });
  });

  it('shrinks a window larger than the bounds', () => {
    const small: ViewportLimits = { minSpan: 10, maxSpan: 5000, bounds: [0, 300] };
    expect(clampViewport({ start: -100, end: 900 }, small)).toEqual({ start: 0, end: 300 });
  });
});

describe('reveal', () => {
  const vp = { start: 100, end: 200 };

  it('does nothing when the range is already visible', () => {
    expect(reveal(vp, 120, 150, limits, 5)).toBe(vp);
  });

  it('moves the minimum distance', () => {
    expect(reveal(vp, 210, 220, limits)).toEqual({ start: 120, end: 220 });
    expect(reveal(vp, 80, 90, limits, 5)).toEqual({ start: 75, end: 175 });
  });

  it('centers a range wider than the window', () => {
    expect(reveal(vp, 300, 600, limits)).toEqual({ start: 400, end: 500 });
  });
});
