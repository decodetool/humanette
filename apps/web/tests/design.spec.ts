import { test, expect } from '@playwright/test';

test('theme starts from system, then persists a two-state choice; navigation and copy', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Main', exact: true });
  await expect(nav.getByRole('link')).toHaveText(['Docs', 'Examples']);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy Install', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install humanette');
  await page.getByRole('link', { name: 'Examples', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Examples', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Move and click',
    'Text selection',
    'Drag & Drop',
  ]);
  await expect(page.getByLabel('Cursor size')).toHaveCount(0);
  await expect(page.locator('.token.keyword').first()).toBeVisible();
  await page.getByRole('button', { name: 'Copy Move and click example' }).click();
  const example = await page.evaluate(() => navigator.clipboard.readText());
  expect(example).toContain("from 'humanette'");
  expect(example).toContain("from 'playwright'");
  expect(example).toContain('await browser.newPage()');
  expect(example).toContain("await page.goto('https://your-app.example')");
  expect(example).toContain('await browser.close()');
  await page.goto('/docs');
  await expect(page.getByRole('link', { name: 'Get started', exact: true })).toHaveAttribute(
    'href',
    '/docs',
  );
  await expect(page.getByText('Add a cursor to a page')).toHaveCount(0);
});

test('live cursor catalog remains available for comparisons', async ({ page }) => {
  await page.goto('/examples/live');
  await page.getByLabel('Filter cursors').fill('resize');
  await expect(page.getByTestId('cursor-pointer')).toHaveCount(0);
  await expect(page.getByTestId('cursor-col-resize')).toBeVisible();
  await page.getByLabel('Filter cursors').fill('no such cursor');
  await expect(page.getByText('No matching cursors.', { exact: false })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`all routes fit desktop and mobile in ${theme} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/examples', '/docs', '/workbench']) {
        await page.goto(route);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        if (route === '/workbench') await expect(page.getByLabel('Timeline JSON')).toBeVisible();
        await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: `test-results/design-${theme}-${width}-${route.slice(1) || 'home'}.png`,
        });
      }
    }
    expect(errors).toEqual([]);
  });
}
