import { type RefObject, useLayoutEffect, useState } from 'react';

/**
 * Tracks an element's content width with ResizeObserver.
 * Falls back to `fallback` where ResizeObserver does not exist (jsdom, old browsers).
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
