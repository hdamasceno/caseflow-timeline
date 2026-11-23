import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { readTodayFromUrl } from './lib/url';

describe('<App>', () => {
  it('summarises deadline statuses for the chosen day', () => {
    render(<App timelineWidth={1000} />);
    const summary = screen.getByRole('region', { name: 'Deadline summary' });
    expect(summary).toHaveTextContent('1 overdue');
    expect(summary).toHaveTextContent('1 due within 7 days');
    expect(summary).toHaveTextContent('2 upcoming');
    expect(summary).toHaveTextContent('2 met');
  });

  it('recomputes statuses when the "as of" date changes', () => {
    render(<App timelineWidth={1000} />);
    // Native date inputs emit one complete value per change.
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-08-01' } });
    expect(screen.getByRole('region', { name: 'Deadline summary' })).toHaveTextContent('4 overdue');
  });

  it('adds a calculated deadline to the timeline and the table, and selects it', async () => {
    const user = userEvent.setup();
    render(<App timelineWidth={1000} />);
    const label = screen.getByLabelText('Label');
    await user.clear(label);
    await user.type(label, 'Courtesy copy');
    await user.click(screen.getByRole('button', { name: 'Add to timeline' }));

    const marker = screen.getByTestId('item-custom-1');
    expect(marker).toHaveAccessibleName(/^Deadline Courtesy copy, due Jun 16, 2026/);
    expect(marker).toHaveAttribute('aria-pressed', 'true');
    const row = screen.getByRole('button', { name: 'Courtesy copy' }).closest('tr')!;
    expect(row).toHaveAttribute('aria-selected', 'true');
  });

  it('selects an item on the timeline from the table', async () => {
    const user = userEvent.setup();
    render(<App timelineWidth={1000} />);
    const table = screen.getByRole('table');
    await user.click(within(table).getByRole('button', { name: 'Receipt notice' }));
    expect(screen.getByTestId('item-receipt')).toHaveAttribute('aria-pressed', 'true');
  });

  it('reads a valid ?today= parameter only', () => {
    expect(readTodayFromUrl('?today=2026-01-31')).toBe('2026-01-31');
    expect(readTodayFromUrl('?today=2026-02-31')).toBeUndefined();
    expect(readTodayFromUrl('')).toBeUndefined();
  });
});
