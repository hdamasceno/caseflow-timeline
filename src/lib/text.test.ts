import { describe, expect, it } from 'vitest';
import { fitLabel } from './text';

describe('fitLabel', () => {
  it('keeps, shortens or drops a label by the space available', () => {
    expect(fitLabel('Short', 200)).toBe('Short');
    expect(fitLabel('Intake & eligibility review', 80)).toBe('Intake & el…');
    expect(fitLabel('Intake & eligibility review', 20)).toBeNull();
  });
});
