import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BusinessCalendar } from '../lib/holidays';
import { resolveCase } from '../model/case';
import { DEMO_TODAY, demoCase } from '../model/demoCase';
import { Timeline } from './Timeline';

const items = resolveCase(demoCase, DEMO_TODAY, new BusinessCalendar());

function setup(props: Partial<Parameters<typeof Timeline>[0]> = {}) {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  const utils = render(<Timeline items={items} today={DEMO_TODAY} width={1000} onSelect={onSelect} {...props} />);
  return { ...utils, user, onSelect };
}

const unit = () => screen.getByTestId('tick-unit').textContent;

describe('<Timeline>', () => {
  it('renders every item with an accessible name', () => {
    setup();
    for (const item of items) {
      expect(screen.getByTestId(`item-${item.id}`)).toHaveAttribute('aria-label');
    }
    expect(screen.getByRole('button', { name: /^Deadline Response due to agency, due Jul 16, 2026, upcoming$/ })).toBeInTheDocument();
  });

  it('puts overlapping phases on different lanes', () => {
    setup();
    const y = (id: string) => screen.getByTestId(`item-${id}`).querySelector('rect')?.getAttribute('y');
    // Evidence collection overlaps both intake and expert letters...
    expect(y('evidence')).not.toBe(y('intake'));
    expect(y('evidence')).not.toBe(y('letters'));
    // ...but letters start after intake ends, so they can share a lane.
    expect(y('letters')).toBe(y('intake'));
  });

  it('keeps exactly one item in the tab order and moves it with the arrow keys', async () => {
    const { user } = setup();
    const tabbable = () => screen.getAllByRole('button', { pressed: false }).filter((el) => el.getAttribute('tabindex') === '0');
    expect(tabbable()).toHaveLength(1);

    await user.tab(); // zoom in
    await user.tab(); // zoom out
    await user.tab(); // fit
    await user.tab(); // today
    await user.tab(); // first timeline item
    expect(document.activeElement).toBe(screen.getByTestId(`item-${items[0]!.id}`));

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByTestId(`item-${items[1]!.id}`));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByTestId(`item-${items.at(-1)!.id}`));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByTestId(`item-${items[0]!.id}`));
    expect(tabbable()).toHaveLength(1);
  });

  it('shows a tooltip for the focused item and links it with aria-describedby', async () => {
    const { user } = setup();
    screen.getByTestId('item-rfe-due').focus();
    const tip = await screen.findByRole('tooltip');
    expect(within(tip).getByText('Response due to agency')).toBeInTheDocument();
    expect(within(tip).getByText(/87 calendar days, next business day after “Evidence request received”/)).toBeInTheDocument();
    expect(screen.getByTestId('item-rfe-due')).toHaveAttribute('aria-describedby', tip.id);
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('lists holidays a deadline skips in the tooltip', () => {
    setup();
    fireEvent.pointerEnter(screen.getByTestId('item-draft-review'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Skips: Memorial Day');
  });

  it('selects with Enter and with a click', async () => {
    const { user, onSelect } = setup();
    screen.getByTestId('item-receipt').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('receipt');
    await user.click(screen.getByTestId('item-client-docs'));
    expect(onSelect).toHaveBeenLastCalledWith('client-docs');
  });

  it('zooms with the toolbar and the keyboard, and picks finer ticks', async () => {
    const { user } = setup();
    expect(unit()).toBe('month');
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(unit()).toBe('week');
    screen.getByTestId('item-rfe-due').focus();
    await user.keyboard('++++');
    expect(unit()).toBe('day');
    await user.keyboard('0');
    expect(unit()).toBe('month');
  });

  it('zooms with the mouse wheel and pans horizontally', () => {
    const { container } = setup();
    const svg = container.querySelector('svg')!;
    const firstTick = () => screen.getAllByTestId('tick')[0]!.getAttribute('transform');
    fireEvent.wheel(svg, { deltaY: -800, clientX: 500 });
    expect(unit()).not.toBe('month');
    const before = firstTick();
    fireEvent.wheel(svg, { deltaX: 300, deltaY: 0 });
    expect(firstTick()).not.toBe(before);
  });

  it('pans by dragging without selecting the item under the pointer', () => {
    const { container, onSelect } = setup();
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const svg = container.querySelector('svg')!;
    const target = screen.getByTestId('item-review');
    const before = target.querySelector('rect')!.getAttribute('x');
    fireEvent.pointerDown(svg, { button: 0, clientX: 600, pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 450, pointerId: 1 });
    fireEvent.pointerUp(svg, { clientX: 450, pointerId: 1 });
    fireEvent.click(target);
    expect(target.querySelector('rect')!.getAttribute('x')).not.toBe(before);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('reveals an item selected from outside', () => {
    const { rerender } = setup();
    // Zoom far in around the first item, so the last one is off screen.
    for (let i = 0; i < 6; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    rerender(<Timeline items={items} today={DEMO_TODAY} width={1000} selectedId="rfe-due" />);
    const el = screen.getByTestId('item-rfe-due');
    const x = Number(el.querySelector('.marker__stem')!.getAttribute('x1'));
    expect(x).toBeGreaterThan(16);
    expect(x).toBeLessThan(1000 - 16);
    expect(el).toHaveAttribute('aria-pressed', 'true');
  });
});
