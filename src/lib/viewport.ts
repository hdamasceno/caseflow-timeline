/** The visible window of the timeline, in (fractional) day numbers. */
export interface Viewport {
  start: number;
  end: number;
}

export interface ViewportLimits {
  /** Smallest visible span in days (most zoomed in). */
  minSpan: number;
  /** Largest visible span in days (most zoomed out). */
  maxSpan: number;
  /** The viewport may not leave this range. */
  bounds: readonly [number, number];
}

export function span(vp: Viewport): number {
  return vp.end - vp.start;
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Keeps the span within limits and slides the window back inside the bounds. */
export function clampViewport(vp: Viewport, limits: ViewportLimits): Viewport {
  const [b0, b1] = limits.bounds;
  const maxSpan = Math.min(limits.maxSpan, b1 - b0);
  const s = clampNum(span(vp), Math.min(limits.minSpan, maxSpan), maxSpan);
  const center = (vp.start + vp.end) / 2;
  const start = clampNum(center - s / 2, b0, b1 - s);
  return { start, end: start + s };
}

/**
 * Zooms by `factor` (> 1 zooms in) while keeping `anchor` at the same screen position,
 * which is what users expect from wheel zoom under the cursor.
 */
export function zoomAt(
  vp: Viewport,
  factor: number,
  anchor: number,
  limits: ViewportLimits,
): Viewport {
  if (!(factor > 0)) throw new RangeError('factor must be positive');
  const [b0, b1] = limits.bounds;
  const maxSpan = Math.min(limits.maxSpan, b1 - b0);
  const old = span(vp);
  const next = clampNum(old / factor, Math.min(limits.minSpan, maxSpan), maxSpan);
  const ratio = old === 0 ? 0.5 : (anchor - vp.start) / old;
  const start = clampNum(anchor - ratio * next, b0, b1 - next);
  return { start, end: start + next };
}

export function panBy(vp: Viewport, deltaDays: number, limits: ViewportLimits): Viewport {
  const [b0, b1] = limits.bounds;
  const s = span(vp);
  const start = clampNum(vp.start + deltaDays, b0, b1 - s);
  return { start, end: start + s };
}

/** Moves the window as little as possible so `[from, to]` is visible with `margin` days to spare. */
export function reveal(
  vp: Viewport,
  from: number,
  to: number,
  limits: ViewportLimits,
  margin = 0,
): Viewport {
  const s = span(vp);
  if (from - margin >= vp.start && to + margin <= vp.end) return vp;
  if (to - from + 2 * margin > s) {
    // Too wide to fit: center it instead.
    return panBy(vp, (from + to) / 2 - (vp.start + vp.end) / 2, limits);
  }
  const delta = from - margin < vp.start ? from - margin - vp.start : to + margin - vp.end;
  return panBy(vp, delta, limits);
}
