import { expect, test } from '@playwright/test';
import { createHuman } from 'humanette';

declare global {
  interface Window {
    idleFrames: number;
    idleShadow: ShadowRoot;
  }
}

for (const renderer of ['svg', 'canvas'] as const) {
  test(`${renderer}: cursor dims during typing, can fully hide, wakes on mouse input, and cleans up`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 400 });
    await page.goto('about:blank');
    await page.setContent('<input aria-label="Title"><button>Save</button>');
    await page.evaluate(() => {
      window.idleFrames = 0;
      const request = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (fn) =>
        request((time) => {
          window.idleFrames++;
          fn(time);
        });
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) {
        const shadow = attach.call(this, options);
        if (this.tagName === 'HUMANETTE-POINTER') window.idleShadow = shadow;
        return shadow;
      };
    });
    const human = await createHuman(page, {
      renderer,
      motionBlur: 0,
      autoHideTimeout: 500,
      hiddenOpacity: 0.5,
    });
    const cursor = page.locator('[data-humanette]');
    try {
      await human.click(page.getByLabel('Title'));
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await page.keyboard.insertText('h');
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.3', { timeout: 200 });
      await page.keyboard.type('ello', { delay: 240 });
      await expect(page.getByLabel('Title')).toHaveValue('hello');
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.5');
      await page.waitForTimeout(400); // Let the final typing-state deadline settle.
      const restingFrames = await page.evaluate(() => window.idleFrames);
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => window.idleFrames)).toBe(restingFrames);
      await human.configure({ hiddenOpacity: 0 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0');
      expect(
        await page.evaluate(() => {
          const canvas = window.idleShadow.querySelector('canvas')!;
          const pixels = canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height).data;
          return {
            svgHidden: [...window.idleShadow.querySelectorAll('div')].every(
              (el) => el.style.display === 'none',
            ),
            canvasClear: !pixels.some((value, i) => i % 4 === 3 && value !== 0),
          };
        }),
      ).toEqual({ svgHidden: true, canvasClear: true });
      const idleFrames = await page.evaluate(() => window.idleFrames);
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => window.idleFrames)).toBe(idleFrames);
      await human.configure({ hiddenOpacity: 0.5 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.5');
      await page.mouse.down(); // Same position: preserve the text-selection opacity while held.
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.3');
      await page.waitForTimeout(1200);
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.3');
      await page.mouse.up();
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.5');
      await human.moveTo(page.getByRole('button'), { duration: 100 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await human.hideCursor();
      await human.moveTo(page.getByLabel('Title'), { duration: 100 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0');
      await human.showCursor();
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.5');
      await human.configure({ autoHideTimeout: 0 });
      await page.waitForTimeout(1200);
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await human.configure({ autoHideTimeout: 100, hiddenOpacity: 0.2 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.2');
      await human.configure({ autoHideTimeout: 0, dimmedOpacity: 0.2 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await page.keyboard.insertText('!');
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.2');
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await page.keyboard.press('ArrowLeft');
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.2', { timeout: 200 });
      await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
      await human.configure({ autoHideTimeout: 500 });
      await human.moveTo(page.getByLabel('Title'), { duration: 100 });
      await human.dispose();
      const disposedFrames = await page.evaluate(() => window.idleFrames);
      await page.waitForTimeout(1200);
      expect(await page.evaluate(() => window.idleFrames)).toBe(disposedFrames);
      await expect(cursor).toHaveCount(0);
    } finally {
      await page.mouse.up();
      await human.dispose();
    }
  });
}

test('homepage demos keep their cursor visible; the dedicated dimming example opts in', async ({
  page,
}) => {
  await page.goto('/#examples');
  const scene = page.getByTestId('example-typing');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.getByTestId('example-typing-target')).toHaveText('Make something great.');
  await expect(scene.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '1');
  const dimming = page.getByTestId('example-dimming');
  await dimming.scrollIntoViewIfNeeded();
  await expect(dimming.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '0');
  await expect(dimming.locator('[data-humanette]')).toHaveAttribute('data-cursor-opacity', '1');
});

test('idle configuration survives navigation and updates a paused visual timeline', async ({
  page,
}) => {
  await page.goto('about:blank');
  const human = await createHuman(page);
  try {
    await human.configure({ dimmedOpacity: 0.2, hiddenOpacity: 0.75 });
    await human.hideCursor();
    await page.goto('data:text/html,<input aria-label="Title">');
    await human.click(page.getByLabel('Title'));
    const cursor = page.locator('[data-humanette]');
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '0');
    await page.keyboard.insertText('Still works');
    await expect(page.getByLabel('Title')).toHaveValue('Still works');
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '0');
    await human.showCursor();
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
    await page.waitForTimeout(1200);
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
    await page.keyboard.press('ArrowLeft');
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.2', { timeout: 200 });
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '1');
    await human.configure({ autoHideTimeout: 100 });
    await expect(cursor).toHaveAttribute('data-cursor-opacity', '0.75');
    await page.evaluate(async () => {
      const cursor = window.Humanette.createHumanette({ hiddenOpacity: 0, autoHideTimeout: 500 });
      await cursor.ready;
      cursor.seek([{ at: 0, type: 'move', x: 200, y: 100, duration: 100 }], 2000);
      await new Promise(requestAnimationFrame);
      const opacity = () => cursor.element.dataset.cursorOpacity;
      if (opacity() !== '0') throw new Error('Late seek should hide cursor');
      cursor.configure({ autoHideTimeout: 0 });
      await new Promise(requestAnimationFrame);
      if (opacity() !== '1') throw new Error('Configuration should update paused seek');
      cursor.dispose();
    });
  } finally {
    await human.dispose();
  }
});
