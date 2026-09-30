import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { createHumanette } from 'humanette/internal';

declare global {
  interface Window {
    Humanette: typeof import('humanette/internal');
    testCursor: ReturnType<typeof createHumanette>;
    testShadows: ShadowRoot[];
    testImages: number;
    testFrames: number;
  }
}
const bundle = readFileSync('../../packages/humanette/dist/humanette.global.js', 'utf8');

test.beforeEach(async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    '<body style="background:#16130f"><div id="root" style="position:relative;width:600px;height:400px"></div></body>',
  );
  await page.evaluate(() => {
    window.testShadows = [];
    window.testImages = 0;
    window.testFrames = 0;
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const shadow = attach.call(this, options);
      window.testShadows.push(shadow);
      return shadow;
    };
    const OriginalImage = window.Image;
    window.Image = class extends OriginalImage {
      constructor() {
        super();
        window.testImages++;
      }
    };
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      request((time) => {
        window.testFrames++;
        callback(time);
      });
  });
  await page.addScriptTag({ content: bundle });
});

test('bundled SVG retains artwork, display-size viewport and scaled hotspot; stops when idle', async ({
  page,
}) => {
  await page.evaluate(async () => {
    window.testCursor = window.Humanette.createHumanette({
      root: document.querySelector<HTMLElement>('#root')!,
      scale: 4,
      motionBlur: 0,
    });
    await window.testCursor.ready;
    window.testCursor.setCursor('default');
    window.testCursor.setPosition({ x: 200, y: 150 });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.testShadows.at(-1)?.querySelector('svg')?.getAttribute('width')),
    )
    .toBe('256');
  expect(
    await page.evaluate(() => ({
      images: window.testImages,
      filter: !!window.testShadows.at(-1)?.querySelector('filter'),
      paths: !!window.testShadows.at(-1)?.querySelector('path'),
      transform: (window.testShadows.at(-1)!.host as HTMLElement).style.transform,
    })),
  ).toEqual({ images: 0, filter: true, paths: true, transform: 'translate(72px, 22px)' });
  await page.waitForTimeout(250);
  const frames = await page.evaluate(() => window.testFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.testFrames)).toBe(frames);
  await page.evaluate(() => {
    window.testCursor.setCursor('text');
    window.testCursor.down();
  });
  await expect(page.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '0.4');
  await page.screenshot({ path: 'test-results/svg-text-pressed.png' });
  await page.evaluate(() => {
    window.testCursor.up();
    window.testCursor.hide();
  });
  await expect
    .poll(() => page.evaluate(() => (window.testShadows.at(-1)!.host as HTMLElement).style.display))
    .toBe('none');
  await page.evaluate(() => window.testCursor.dispose());
  await expect(page.locator('[data-humanette]')).toHaveCount(0);
});

test('custom image themes stay inert and do not fall back to default SVG', async ({ page }) => {
  await page.evaluate(async () => {
    window.testCursor = window.Humanette.createHumanette({ scale: 4 });
    await window.testCursor.ready;
    window.testCursor.setCursor('pointer');
    window.testCursor.setPosition({ x: 200, y: 150 });
  });
  await expect
    .poll(() => page.evaluate(() => (window.testShadows.at(-1)!.host as HTMLElement).style.display))
    .toBe('block');
  await page.evaluate(async () => {
    await window.testCursor.setTheme({
      pointer: {
        src:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>',
          ),
        width: 20,
        height: 20,
        hotspot: [0, 0],
      },
    });
  });
  await expect
    .poll(() => page.evaluate(() => (window.testShadows.at(-1)!.host as HTMLElement).style.display))
    .toBe('none');
  expect(await page.evaluate(() => window.testImages)).toBe(1);
  await page.evaluate(async () => {
    await window.testCursor.setTheme({ pointer: window.Humanette.cursors.pointer });
  });
  await expect
    .poll(() => page.evaluate(() => (window.testShadows.at(-1)!.host as HTMLElement).style.display))
    .toBe('block');
  await page.evaluate(() => window.testCursor.dispose());
});

test('scale, press feedback, trail and keyboard ordering preserve the SVG geometry', async ({
  page,
}) => {
  await page.evaluate(async () => {
    window.testCursor = window.Humanette.createHumanette({ scale: 4, keyboard: true });
    await window.testCursor.ready;
    window.testCursor.setCursor('default');
    window.testCursor.setPosition({ x: 200, y: 150 });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.testShadows.at(-1)?.querySelector('svg')?.getAttribute('width')),
    )
    .toBe('256');
  const trail = await page.evaluate(async () => {
    window.testCursor.configure({ scale: 6 });
    window.testCursor.setPosition({ x: 500, y: 150 });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return window.testShadows.slice(1).map((scope) => ({
      width: scope.querySelector('svg')?.getAttribute('width'),
      display: (scope.host as HTMLElement).style.display,
      filter: scope.querySelector('filter')?.id,
    }));
  });
  expect(trail).toHaveLength(2);
  expect(trail.map((slot) => slot.width)).toEqual(['384', '384']);
  expect(trail.map((slot) => slot.display)).toEqual(['block', 'block']);
  expect(trail[0].filter).toBeTruthy();
  expect(trail[0].filter).toBe(trail[1].filter); // Same source IDs, separate shadow scopes.
  await page.evaluate(() => window.testCursor.down());
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(window.testShadows.at(-1)!.querySelector('svg')!.getAttribute('width')),
      ),
    )
    .toBeCloseTo(360.96);
  await page.keyboard.press('Control+k');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scope = window.testShadows[0];
        const badge = scope.lastElementChild as HTMLCanvasElement;
        return {
          tag: badge.tagName,
          visible: badge.style.display,
          clipped: getComputedStyle(scope.host).overflow,
        };
      }),
    )
    .toEqual({ tag: 'CANVAS', visible: 'block', clipped: 'hidden' });
  await page.evaluate(() => window.testCursor.dispose());
});

test('press and release finish when frame timestamps precede the input event', async ({ page }) => {
  await page.evaluate(async () => {
    window.testCursor = window.Humanette.createHumanette({ scale: 4, motionBlur: 0 });
    await window.testCursor.ready;
    window.testCursor.setCursor('default');
    window.testCursor.setPosition({ x: 200, y: 150 });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.testShadows.at(-1)?.querySelector('svg')?.getAttribute('width')),
    )
    .toBe('256');
  await page.evaluate(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request((time) => callback(time - 100));
    window.testCursor.down();
  });
  await expect(page.locator('[data-humanette]')).toHaveAttribute('data-phase', 'hold');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(window.testShadows.at(-1)?.querySelector('svg')?.getAttribute('width')),
      ),
    )
    .toBeCloseTo(256 * 0.94);
  await page.evaluate(() => window.testCursor.up());
  await expect(page.locator('[data-humanette]')).toHaveAttribute('data-phase', 'up');
  await expect
    .poll(() =>
      page.evaluate(() => window.testShadows.at(-1)?.querySelector('svg')?.getAttribute('width')),
    )
    .toBe('256');
  const frames = await page.evaluate(() => window.testFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.testFrames)).toBe(frames);
  await page.evaluate(() => window.testCursor.dispose());
});

test('canvas renderer remains explicitly selectable', async ({ page }) => {
  await page.evaluate(async () => {
    window.testCursor = window.Humanette.createHumanette({ renderer: 'canvas', scale: 4 });
    await window.testCursor.ready;
    window.testCursor.setPosition({ x: 200, y: 150 });
  });
  await expect(page.locator('[data-humanette]')).toHaveAttribute('data-renderer', 'canvas');
  expect(await page.evaluate(() => window.testImages)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.testShadows.some((s) => !!s.querySelector('svg')))).toBe(
    false,
  );
  await page.evaluate(() => window.testCursor.dispose());
});
