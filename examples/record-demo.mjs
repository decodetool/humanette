// Deterministic real-input demo. Start bun dev first; no LLM calls during the take.
import { chromium } from 'playwright-core';
import { createCursor } from 'bigcursor';
import { launchForPreset, startRecording, installInteractionSounds } from 'bigcursor/recording';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--headful')) {
  throw Error('Usage: bun example:playwright or bun example:playwright:headful');
}
const headful = args.includes('--headful');
const output = resolve('out');
const videoPath = resolve(output, 'playwright-example.mp4');
if (!headful) await mkdir(output, { recursive: true });
const { browser, context, preset } = await launchForPreset(
  chromium,
  {
    viewport: { width: 1280, height: 800 },
    dpr: 1,
    fps: 60,
  },
  { launch: { headless: !headful } },
);
try {
  const page = await context.newPage();
  await page.goto('http://localhost:3410/examples/live');
  await page.getByRole('button', { name: 'Save changes', exact: true }).waitFor();
  const cursor = await createCursor(page, { seed: 42, scale: 4 });
  const sounds = headful ? await installInteractionSounds(page) : null;
  const recording = headful ? null : await startRecording(page, preset);
  try {
    if (headful) {
      await page.bringToFront();
      console.log(
        'Running live without recording. The window stays open afterward; close it to exit.',
      );
      await cursor.wait(1200);
    }
    await cursor.click('#save', { duration: 1200 });
    await cursor.type('#name', 'A cursor touch', { selectAll: true, duration: 1200 });
    const r = await page.locator('#select-text').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await cursor.drag(
      { x: r.x + 1, y: r.y + r.h / 2 },
      { x: r.x + r.w - 1, y: r.y + r.h / 2 },
      { duration: 1100 },
    );
    await cursor.drag('#card', '#drop', { duration: 1100 });
    await cursor.wait(700);
    const result = await page.evaluate(() => ({
      saved: document.querySelector('#save').textContent,
      name: document.querySelector('#name').value,
      delivered: document.querySelector('#card').textContent,
      selection: getSelection().toString(),
    }));
    if (
      result.saved !== 'Changes saved' ||
      result.name !== 'A cursor touch' ||
      result.delivered !== 'Delivered'
    )
      throw Error('Postflight failed: ' + JSON.stringify(result));
    if (!headful) {
      const capture = await recording.stop(videoPath);
      await writeFile(
        resolve(output, 'playwright-example.json'),
        JSON.stringify(
          {
            seed: 42,
            viewport: [1280, 800],
            dpr: preset.dpr,
            videoSize: [1280, 800],
            capture,
            requestedFps: preset.fps,
            result,
          },
          null,
          2,
        ),
      );
      await page.screenshot({ path: resolve(output, 'playwright-example.png') });
    } else {
      console.log('Demo complete. Close the browser window to exit.');
      await page.waitForEvent('close', { timeout: 0 });
    }
  } finally {
    try {
      if (recording) await recording.stop(videoPath);
    } finally {
      await sounds?.dispose();
      await cursor.dispose();
    }
  }
  await context.close();
  if (!headful) {
    console.log('Saved ' + videoPath + ' (replaces the previous example recording).');
  }
} finally {
  await browser.close();
}
