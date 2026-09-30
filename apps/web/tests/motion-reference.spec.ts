import { test, expect } from '@playwright/test';

test('CSS reference moves without a cursor and can be paused', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/examples/live');
  const reference = page.getByTestId('motion-reference');
  await expect(reference).toHaveAttribute('data-running', 'true');
  await expect(page.locator('[data-humanette]')).toHaveCount(0);
  for (const id of ['motion-rotation', 'motion-travel']) {
    const element = page.getByTestId(id);
    await expect(id === 'motion-travel' ? element.locator(':scope > div') : element).toBeInViewport(
      { ratio: 1 },
    );
    await expect(element).toHaveCSS('animation-timing-function', 'linear');
    const start = await element.evaluate((el) => getComputedStyle(el).transform);
    await expect
      .poll(() => element.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(start);
  }
  await page.getByLabel('Animate reference').uncheck();
  await expect(reference).toHaveAttribute('data-running', 'false');
  await expect(page.getByTestId('motion-rotation')).toHaveCSS('animation-play-state', 'paused');
  await page.screenshot({ path: 'test-results/motion-reference.png' });
});

test('reduced motion starts paused but can be explicitly enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/examples/live');
  await expect(page.getByLabel('Animate reference')).not.toBeChecked();
  await page.getByLabel('Animate reference').check();
  await expect(page.getByTestId('motion-reference')).toHaveAttribute('data-running', 'true');
});
