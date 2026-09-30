import { expect, test, type Page } from '@playwright/test';
import { createHuman } from 'humanette';

async function seek(page: Page, time: number) {
  await page.getByLabel('Timeline position').evaluate((element, value) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      String(value),
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
}

for (const width of [1280, 390]) {
  test(`text highlight follows the drag at ${width}px and survives release`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/workbench');
    await expect(page.locator('[data-humanette]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Select text', exact: true }).click();
    const highlight = page.getByTestId('selection-highlight');
    const label = page.getByTestId('selection-text');
    const selectedWidth = async () => (await highlight.boundingBox())!.width;
    await seek(page, 850);
    await expect.poll(selectedWidth).toBe(0);
    await seek(page, 1100);
    await expect(page.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '0.4');
    await expect.poll(selectedWidth).toBeGreaterThan(0);
    expect(await selectedWidth()).toBeLessThan((await label.boundingBox())!.width * 0.8);
    await page.screenshot({ path: `test-results/text-selection-${width}.png` });
    await seek(page, 2200);
    await expect
      .poll(async () => Math.abs((await selectedWidth()) - (await label.boundingBox())!.width))
      .toBeLessThan(1);
    await seek(page, 2900);
    await expect(page.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '1');
    await expect
      .poll(async () => Math.abs((await selectedWidth()) - (await label.boundingBox())!.width))
      .toBeLessThan(1);
    await seek(page, 0);
    await expect.poll(selectedWidth).toBe(0);
  });
}

test('real text drags fade the cursor, but hover and release stay opaque', async ({ page }) => {
  await page.goto('/examples/live');
  const human = await createHuman(page);
  try {
    await human.moveTo('#select-text');
    await expect(page.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '1');
    await page.mouse.down();
    await expect(page.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '0.4');
    await page.mouse.up();
    await expect(page.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '1');
  } finally {
    await page.mouse.up();
    await human.dispose();
  }
});
