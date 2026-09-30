import { expect, test } from '@playwright/test';

test('theme toggles in both directions on the development origin', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto(process.env.HUMANETTE_TEST_URL ?? '/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('navigation icons change foreground only on hover', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  for (const icon of [
    page.getByRole('link', { name: 'GitHub', exact: true }),
    page.getByRole('button', { name: 'Switch to light mode' }),
  ]) {
    await page.mouse.move(0, 0);
    const normal = await icon.evaluate((element) => getComputedStyle(element).color);
    await icon.hover();
    await expect(icon).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect
      .poll(() => icon.evaluate((element) => getComputedStyle(element).color))
      .not.toBe(normal);
  }
  await page.screenshot({
    path: 'test-results/navigation-hover.png',
    clip: { x: 880, y: 0, width: 400, height: 90 },
  });
});
