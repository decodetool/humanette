// Run after the package build: bun scripts/compare-renderers.mjs
// This is a local experiment, not a hardware-independent performance threshold.
import { chromium, webkit } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const bundle = await readFile(
  new URL('../packages/humanette/dist/humanette.global.js', import.meta.url),
  'utf8',
);
await mkdir('test-results/renderer-comparison', { recursive: true });
const results = [];
for (const [engine, browserType] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  const browser = await browserType.launch();
  for (const renderer of ['canvas', 'svg']) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 3,
    });
    await page.setContent(
      '<body style="margin:0;background:#16130f"><canvas id="scene" width="1280" height="800"></canvas></body>',
    );
    await page.addScriptTag({ content: bundle });
    const frames = [];
    const session = engine === 'chromium' ? await page.context().newCDPSession(page) : null;
    if (session) {
      await session.send('Performance.enable');
      session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        frames.push({
          time: metadata.timestamp * 1000,
          data,
        });
        void session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      await session.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 80,
        maxWidth: 1280,
        maxHeight: 800,
        everyNthFrame: 1,
      });
    }
    const before = session ? await session.send('Performance.getMetrics') : null;
    const sample = await page.evaluate(async (renderer) => {
      const cursor = window.Humanette.createHumanette({ renderer, scale: 4, motionBlur: 0 });
      await cursor.ready;
      cursor.setCursor('default');
      const scene = document.querySelector('#scene').getContext('2d');
      const intervals = [];
      const feedbackIntervals = [];
      let previous;
      let feedbackStarted = false;
      const start = performance.now();
      const wallStart = Date.now();
      await new Promise((resolve) => {
        function tick(now) {
          const elapsed = now - start;
          if (previous !== undefined && elapsed > 2000) {
            (elapsed < 4000 ? intervals : feedbackIntervals).push(now - previous);
          }
          previous = now;
          // Prime the capture sampler with large-area damage, then ONLY move the cursor.
          if (elapsed < 2000) {
            scene.fillStyle = `hsl(${elapsed / 10} 20% 12%)`;
            scene.fillRect(0, 0, 1280, 800);
          }
          cursor.setPosition({
            x: 640 + 300 * Math.sin(elapsed / 500),
            y: 400 + 150 * Math.cos(elapsed / 700),
          });
          if (elapsed >= 4000) {
            if (!feedbackStarted) {
              cursor.configure({ motionBlur: 0.2 });
              feedbackStarted = true;
            }
            if (elapsed % 800 < 400) cursor.down();
            else cursor.up();
          }
          if (elapsed < 6200) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
      cursor.up();
      cursor.configure({ motionBlur: 0 });
      // Keep it visible for screenshots after the measured movement.
      return { intervals, feedbackIntervals, wallStart };
    }, renderer);
    const after = session ? await session.send('Performance.getMetrics') : null;
    if (session) await session.send('Page.stopScreencast');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `test-results/renderer-comparison/${engine}-${renderer}.png` });
    // Include the last large-damage frame so a stall at the transition cannot disappear.
    const transition = frames.findIndex((frame) => frame.time >= sample.wallStart + 2000);
    const captures = transition < 0 ? [] : frames.slice(Math.max(0, transition - 1));
    const captureGaps = captures.slice(1).map((frame, i) => frame.time - captures[i].time);
    // Analyze actual white cursor pixels AFTER measurement, not JPEG hashes (which can
    // change through compression noise even when the cursor has not moved).
    const positions = session
      ? await page.evaluate(async (captures) => {
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 800;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          const positions = [];
          for (const frame of captures) {
            const image = new Image();
            image.src = 'data:image/jpeg;base64,' + frame.data;
            await image.decode();
            context.clearRect(0, 0, 1280, 800);
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, 1280, 800).data;
            let x = 0,
              y = 0,
              count = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              if (pixels[i] > 210 && pixels[i + 1] > 210 && pixels[i + 2] > 210) {
                x += (i / 4) % 1280;
                y += Math.floor(i / 4 / 1280);
                count++;
              }
            }
            positions.push({
              time: frame.time,
              x: count ? x / count : null,
              y: count ? y / count : null,
            });
          }
          return positions;
        }, captures)
      : [];
    const movedFrames = positions
      .slice(1)
      .filter(
        (point, i) =>
          point.x !== null &&
          positions[i].x !== null &&
          Math.hypot(point.x - positions[i].x, point.y - positions[i].y) > 0.5,
      ).length;
    await writeFile(
      `test-results/renderer-comparison/${engine}-${renderer}-positions.json`,
      JSON.stringify(positions),
    );
    const stats = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        count: values.length,
        medianMs: sorted[Math.floor(sorted.length / 2)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        maxMs: sorted.at(-1),
        over70ms: values.filter((n) => n > 70).length,
      };
    };
    const metric = (name) =>
      after.metrics.find((m) => m.name === name).value -
      before.metrics.find((m) => m.name === name).value;
    const result = {
      engine,
      renderer,
      raf: stats(sample.intervals),
      feedbackRaf: stats(sample.feedbackIntervals),
      capture: session
        ? {
            ...stats(captureGaps),
            movedFrames,
            missingCursorFrames: positions.filter((p) => p.x === null).length,
          }
        : null,
      taskSeconds: session ? metric('TaskDuration') : null,
      layoutSeconds: session ? metric('LayoutDuration') : null,
      styleSeconds: session ? metric('RecalcStyleDuration') : null,
    };
    results.push(result);
    console.log(JSON.stringify(result));
    await page.close();
  }
  await browser.close();
}
await writeFile('test-results/renderer-comparison/results.json', JSON.stringify(results, null, 2));
