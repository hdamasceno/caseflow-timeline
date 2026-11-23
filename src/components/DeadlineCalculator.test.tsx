import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BusinessCalendar } from '../lib/holidays';
import { DeadlineCalculator } from './DeadlineCalculator';

function setup() {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  render(<DeadlineCalculator calendar={new BusinessCalendar()} defaultStart="2026-11-20" onAdd={onAdd} />);
  return { user, onAdd };
}

describe('<DeadlineCalculator>', () => {
  it('computes business days and lists the holidays it skipped', () => {
    setup();
    // 30 business days from Nov 20 2026 skips Thanksgiving and Christmas.
    expect(screen.getByTestId('calc-result')).toHaveTextContent('Due Jan 6, 2027');
    const list = screen.getByRole('list', { name: 'Holidays skipped' });
    expect(list).toHaveTextContent('Nov 26, 2026 — Thanksgiving Day');
    expect(list).toHaveTextContent('Dec 25, 2026 — Christmas Day');
    expect(list).toHaveTextContent("Jan 1, 2027 — New Year's Day");
  });

  it('switches to calendar days and shows when the date was moved', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Rule'), 'calendar-days');
    const days = screen.getByLabelText('Days');
    await user.clear(days);
    await user.type(days, '8'); // Nov 28 2026 is a Saturday
    expect(screen.getByTestId('calc-result')).toHaveTextContent('Due Nov 30, 2026 (moved from Nov 28, 2026)');

    await user.click(screen.getByLabelText('Move to next business day'));
    expect(screen.getByTestId('calc-result')).toHaveTextContent('Due Nov 28, 2026');
    expect(screen.getByTestId('calc-result')).not.toHaveTextContent('moved');
  });

  it('validates the number of days', async () => {
    const { user } = setup();
    const days = screen.getByLabelText('Days');
    await user.clear(days);
    await user.type(days, '-3');
    expect(screen.getByRole('alert')).toHaveTextContent('whole number');
    expect(days).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Add to timeline' })).toBeDisabled();
  });

  it('adds the deadline with its label and rule', async () => {
    const { user, onAdd } = setup();
    const label = screen.getByLabelText('Label');
    await user.clear(label);
    await user.type(label, 'Brief to client');
    await user.click(screen.getByRole('button', { name: 'Add to timeline' }));
    expect(onAdd).toHaveBeenCalledWith({
      label: 'Brief to client',
      start: '2026-11-20',
      rule: { kind: 'business-days', days: 30 },
    });
  });
});
