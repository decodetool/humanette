import { expect, test } from '@playwright/test';

test('Play demo tolerates a frame timestamp just before playback started', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    // RAF timestamps describe the frame, not the instant the callback runs.
    // Model a busy frame with a timestamp earlier than performance.now().
    window.requestAnimationFrame = (callback) => request((time) => callback(time - 100));
  });
  await page.goto('/workbench');
  await expect(page.locator('[data-humanette]')).toHaveCount(1);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await page.getByRole('button', { name: 'Play demo' }).click();
  await expect
    .poll(async () =>
      errors.length
        ? errors.join('; ')
        : (await page.getByText('Changes saved ✓').isVisible())
          ? 'playing'
          : 'waiting',
    )
    .toBe('playing');
  await expect(page.getByText('Changes saved ✓')).toBeVisible();
  expect(errors).toEqual([]);
  await expect(page.getByRole('button', { name: 'Play demo' })).toBeVisible();
});
