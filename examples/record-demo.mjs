// Deterministic real-input demo. Start bun dev first; no LLM calls during the take.
import { chromium } from 'playwright-core';
import { createHuman } from 'humanette/playwright';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve(process.argv[2] ?? 'out/humanette-demo');
try {
  await access(output);
  throw Error('Choose a new output directory; refusing to overwrite a take.');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: { dir: output, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3410/demos');
  const human = await createHuman(page, { seed: 42, scale: 2.5 });
  try {
    await human.click('#save');
    await human.type('#name', 'A human touch', { selectAll: true, delay: 55 });
    const r = await page.locator('#select-text').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await human.drag(
      { x: r.x + 1, y: r.y + r.h / 2 },
      { x: r.x + r.w - 1, y: r.y + r.h / 2 },
      { duration: 1100 },
    );
    await human.drag('#card', '#drop', { duration: 1100 });
    await human.wait(700);
    const result = await page.evaluate(() => ({
      saved: document.querySelector('#save').textContent,
      name: document.querySelector('#name').value,
      delivered: document.querySelector('#card').textContent,
      selection: getSelection().toString(),
    }));
    if (
      result.saved !== 'Changes saved' ||
      result.name !== 'A human touch' ||
      result.delivered !== 'Delivered'
    )
      throw Error('Postflight failed: ' + JSON.stringify(result));
    await writeFile(
      resolve(output, 'manifest.json'),
      JSON.stringify(
        {
          seed: 42,
          viewport: [1280, 800],
          dpr: 2,
          videoSize: [1280, 800],
          capture: 'Playwright recordVideo; source FPS is recorder-controlled, not guaranteed 60',
          result,
        },
        null,
        2,
      ),
    );
    await page.screenshot({ path: resolve(output, 'final.png') });
  } finally {
    await human.dispose();
  }
  await context.close();
} finally {
  await browser.close();
}
console.log('Saved take and manifest to ' + output);
