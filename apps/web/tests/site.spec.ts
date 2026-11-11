import { test, expect } from '@playwright/test';
import { createCursor } from 'bigcursor';
test('site and live renderer work at desktop and mobile widths', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Screen Studio');
  await page.getByTestId('example-click').scrollIntoViewIfNeeded();
  await expect(page.getByText('Clicked', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png' });
  await page.goto('/workbench');
  await expect(page.getByLabel('Timeline JSON')).toBeVisible();
  await page.getByLabel('Timeline JSON').fill('[{"type":"down","at":0}]');
  await page.getByRole('button', { name: 'Apply timeline' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'pointer-up' })).toBeVisible();
  await page.screenshot({ path: 'test-results/workbench-mobile.png' });
  expect(errors).toEqual([]);
});
test('real adapter clicks, types, selects and drags; CSS comparisons restore native cursor', async ({
  page,
}) => {
  await page.goto('/examples/live');
  const cursor = await createCursor(page, { scale: 2.5 });
  try {
    await cursor.click('#save');
    await expect(page.locator('#save')).toHaveText('Changes saved');
    await cursor.type('#name', 'Start', { selectAll: true, delay: 1 });
    await expect(page.locator('#name')).toHaveValue('Start');
    await cursor.selectText(page.locator('#select-text'), { duration: 400 });
    expect(await page.evaluate(() => getSelection()?.toString())).toBe('Make every move matter.');
    await cursor.drag('#card', '#drop', { duration: 500 });
    await expect(page.locator('#card')).toHaveText('Delivered');
    await cursor.moveTo('[data-testid=cursor-pointer] td:first-of-type');
    await expect(page.locator('[data-bigcursor]')).toHaveAttribute('data-cursor', 'pointer');
    await cursor.moveTo('[data-testid=cursor-pointer] [data-bigcursor-native]');
    await expect(page.locator('[data-bigcursor]')).toHaveCSS('visibility', 'hidden');
    await cursor.moveTo('[data-testid=cursor-text] td:first-of-type');
    await expect(page.locator('[data-bigcursor]')).toHaveCSS('visibility', 'visible');
    await expect(page.locator('[data-bigcursor]')).toHaveAttribute('data-cursor', 'text');
    await page.screenshot({ path: 'test-results/cursor-gallery.png' });
  } finally {
    await cursor.dispose();
  }
  await expect(page.locator('[data-bigcursor]')).toHaveCount(0);
});
test('disposing preserves an application cursor change while hovered', async ({ page }) => {
  await page.goto('/examples/live');
  const cursor = await createCursor(page);
  await cursor.moveTo('#save');
  await page.locator('#save').evaluate((element) => {
    element.style.cursor = 'wait';
  });
  await cursor.dispose();
  await expect(page.locator('#save')).toHaveCSS('cursor', 'wait');
});
test('workbench presets export usable package configuration', async ({ page }) => {
  await page.goto('/workbench');
  await page.getByRole('button', { name: 'Presentation', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export preset' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('bigcursor-preset.json');
  await page.getByRole('button', { name: 'Drag & drop', exact: true }).click();
  await page.getByRole('button', { name: 'Play demo' }).click();
  await expect(page.locator('[data-bigcursor]')).toHaveAttribute('data-phase', 'hold', {
    timeout: 5000,
  });
  await page.screenshot({ path: 'test-results/workbench.png' });
});
