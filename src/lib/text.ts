/**
 * Average glyph width of the 12px UI font. Measuring real text needs layout
 * (and does not work in jsdom), so labels are packed with this estimate.
 */
export const CHAR_W = 6.6;

export function textWidth(s: string): number {
  return s.length * CHAR_W;
}

/** The label, shortened with an ellipsis to fit `maxPx`, or null if too little would be left. */
export function fitLabel(label: string, maxPx: number): string | null {
  if (textWidth(label) <= maxPx) return label;
  const chars = Math.floor(maxPx / CHAR_W) - 1;
  return chars >= 4 ? `${label.slice(0, chars).trimEnd()}…` : null;
}
