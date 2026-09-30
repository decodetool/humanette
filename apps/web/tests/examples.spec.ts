import { expect, test } from '@playwright/test';
import { createHuman } from 'humanette';

test('homepage stacks compact scenes without tabs or removed marketing copy', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Examples', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveText('Made with ❤️ by Decode');
  await expect(page.getByRole('contentinfo')).toHaveCSS('font-size', '16px');
  await expect(page.getByRole('contentinfo').getByRole('link')).toHaveCSS(
    'text-decoration-line',
    'underline',
  );
  await expect(page.getByRole('contentinfo').getByRole('link')).toHaveAttribute(
    'href',
    'https://decode.dev',
  );
  await expect(page.getByRole('link', { name: 'Get started', exact: true })).toHaveAttribute(
    'href',
    '/docs',
  );
  await expect(page.getByRole('button', { name: 'Copy Install', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Screen Studio for browser automation', exact: true }),
  ).toBeVisible();
  const heroCopy = page.getByText(
    'Add large cursors, natural mouse movement, and visible clicks to your Playwright scripts.',
    { exact: true },
  );
  await expect(heroCopy).toHaveCSS('text-align', 'center');
  await expect(
    page.getByText('Create product walkthroughs, or let coding agents show their work.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Move and click',
    'Text selection',
    'Drag & Drop',
  ]);
  await expect(page.getByRole('button', { name: 'Clicks', exact: true })).toHaveCount(0);
  const clickStage = (await page.getByTestId('example-click').boundingBox())!;
  const clickTarget = (await page.getByText('Click me', { exact: true }).boundingBox())!;
  expect(clickTarget.x).toBe(clickStage.x);
  const drop = (await page.getByText('Drop here', { exact: true }).boundingBox())!;
  const draggable = (await page.getByText('Drag me', { exact: true }).boundingBox())!;
  expect(drop.x).toBe(clickStage.x);
  expect(draggable.x - drop.x).toBe(216);
  expect(draggable.width).toBe(128);
  expect(drop.width).toBe(128);
  for (const text of [
    'Follow the action',
    'Read the gesture',
    'Keep your workflow',
    'Use cases',
    'See examples',
    'Built for Playwright. Cursor assets included.',
  ]) {
    await expect(page.getByRole('main').getByText(text, { exact: true })).toHaveCount(0);
  }
  let previousBottom = 0;
  for (const scene of ['click', 'text', 'drag']) {
    const preview = page.getByTestId(`example-${scene}`);
    await expect(preview).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(preview).toHaveCSS('border-top-width', '0px');
    await expect(preview.getByRole('button')).toHaveCount(0);
    const box = (await page
      .getByTestId(`example-${scene}`)
      .getByTestId('example-stage')
      .boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(112);
    expect(box.y).toBeGreaterThan(previousBottom);
    previousBottom = box.y + box.height;
  }
  await page.screenshot({ path: 'test-results/home-stacked.png', fullPage: true });
});

test('examples autoplay, loop, and freeze offscreen without player controls', async ({ page }) => {
  await page.goto('/examples');
  const scene = page.getByTestId('example-click');
  await expect(scene).toHaveAttribute('data-running', 'true');
  await expect(scene.getByText('Clicked', { exact: true })).toBeVisible();
  await expect(scene.getByText('Click me', { exact: true })).toBeVisible();
  await page.getByTestId('example-drag').scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-running', 'false');
  const offscreen = await scene.getAttribute('data-playback-time');
  await page.waitForTimeout(150);
  await expect(scene).toHaveAttribute('data-playback-time', offscreen!);
});

test('click demo darkens while pressed and keeps its original color after release', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/examples');
  const target = page.getByTestId('example-click-target');
  const original = await target.evaluate((element) => getComputedStyle(element).backgroundColor);
  const colors = target.evaluate(
    (element) =>
      new Promise<string[]>((resolve) => {
        let pressed = '';
        const observer = new MutationObserver(() => {
          const background = getComputedStyle(element).backgroundColor;
          if (element.getAttribute('data-pressed') === 'true') pressed = background;
          if (pressed && element.textContent === 'Clicked') {
            observer.disconnect();
            resolve([pressed, background]);
          }
        });
        observer.observe(element, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true,
        });
      }),
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const [pressed, released] = await colors;
  expect(pressed).not.toBe(original);
  expect(released).toBe(original);
});

test('reduced motion starts paused and text highlight follows the selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/examples');
  const scene = page.getByTestId('example-text');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-running', 'false');
  const highlight = scene.getByTestId('example-selection');
  await expect.poll(async () => (await highlight.boundingBox())!.width).toBe(0);
  await expect(scene).toHaveAttribute('data-playback-time', '0');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(async () => (await highlight.boundingBox())!.width, { intervals: [50] })
    .toBeGreaterThan(0);
  const partial = (await highlight.boundingBox())!.width;
  expect(partial).toBeGreaterThan(0);
  const phrase = scene.getByText('these words', { exact: true });
  const start = (await highlight.boundingBox())!.x;
  expect(start).toBe((await phrase.boundingBox())!.x);
  await expect.poll(async () => (await highlight.boundingBox())!.width).toBeGreaterThan(partial);
  expect((await highlight.boundingBox())!.x).toBe(start);
  await expect
    .poll(async () => (await highlight.boundingBox())!.width)
    .toBe((await phrase.boundingBox())!.width);
  await page.screenshot({ path: 'test-results/examples-text.png' });
});

test('root API selects nested, wrapped text using a native locator', async ({ page }) => {
  await page.setContent(
    '<p style="width:140px;font:24px sans-serif">Select <strong>all these</strong> words across lines.</p>',
  );
  const human = await createHuman(page);
  try {
    await human.selectText(page.locator('p'), { duration: 250 });
    expect(await page.evaluate(() => getSelection()?.toString())).toBe(
      'Select all these words across lines.',
    );
  } finally {
    await human.dispose();
  }
});
