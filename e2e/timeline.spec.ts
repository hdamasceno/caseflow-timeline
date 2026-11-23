import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?today=2026-05-04');
});

test('shows the case and a deadline summary', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Case DEMO-1042/);
  const summary = page.getByRole('region', { name: 'Deadline summary' });
  await expect(summary).toContainText('1 overdue');
  await expect(summary).toContainText('1 due within 7 days');
});

test('the timeline fills the container and follows resizes', async ({ page }) => {
  const svg = page.locator('svg.timeline__svg');
  const wide = await svg.evaluate((el) => el.getBoundingClientRect().width);
  await page.setViewportSize({ width: 700, height: 900 });
  await expect.poll(() => svg.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThan(wide);
  // No horizontal page scroll on a narrow screen.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('keyboard users can walk the items and read the tooltip', async ({ page }) => {
  const first = page.getByTestId('item-engaged');
  await first.focus();
  await expect(page.getByRole('tooltip')).toContainText('Engagement signed');
  await page.keyboard.press('End');
  await expect(page.getByTestId('item-decision')).toBeFocused();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

test('mouse wheel zooms in around the cursor', async ({ page }) => {
  const unit = page.getByTestId('tick-unit');
  await expect(unit).toHaveText('month');
  const box = (await page.locator('svg.timeline__svg').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 60);
  for (let i = 0; i < 6; i += 1) await page.mouse.wheel(0, -200);
  await expect(unit).not.toHaveText('month');
});

test('a calculated deadline lands on the timeline', async ({ page }) => {
  await page.getByLabel('Days', { exact: true }).fill('10');
  await expect(page.getByTestId('calc-result')).toContainText('Due May 18, 2026');
  await page.getByLabel('Label', { exact: true }).fill('Courtesy copy');
  await page.getByRole('button', { name: 'Add to timeline' }).click();
  await expect(page.getByTestId('item-custom-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('table')).toContainText('Courtesy copy');
});

test('dragging pans the view', async ({ page }) => {
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const firstTick = page.getByTestId('tick').first();
  const before = await firstTick.getAttribute('transform');
  const box = (await page.locator('svg.timeline__svg').boundingBox())!;
  await page.mouse.move(box.x + 500, box.y + box.height - 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, box.y + box.height - 10, { steps: 5 });
  await page.mouse.up();
  await expect(firstTick).not.toHaveAttribute('transform', before ?? '');
});
