import { test } from '@playwright/test';

// Regenerates the README images. Run with: npm run screenshots
test.skip(!process.env.SCREENSHOTS, 'only when SCREENSHOTS=1');

for (const scheme of ['light', 'dark'] as const) {
  test(`README screenshot (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1240, height: 900 });
    await page.goto('/?today=2026-05-04');
    await page.getByTestId('item-draft-review').locator('.marker__shape').hover({ force: true });
    await page.screenshot({ path: `docs/screenshot-${scheme}.png`, fullPage: true });
  });
}
