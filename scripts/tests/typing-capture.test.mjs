import assert from 'node:assert/strict';
import { installCaptureRefresh } from '../../packages/humanette/src/recording/runtime.js';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { createHuman } from '../../packages/humanette/dist/playwright.js';
import { launchForPreset, startRecording } from '../../packages/humanette/dist/recording.js';

test('capture refresh preserves pixels, handles frames/navigation, and stops when idle', async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  const page = await browser.newPage({
    viewport: { width: 600, height: 400 },
    deviceScaleFactor: 2,
  });
  let refresh;
  try {
    await page.setContent(
      '<body style="margin:0;background:linear-gradient(90deg,#fff,#000,#f06,#39f);height:100vh"><iframe srcdoc="<input aria-label=Child>"></iframe></body>',
    );
    const before = await page.screenshot();
    refresh = await installCaptureRefresh(page);
    await page.keyboard.press('a');
    await page.waitForFunction(() => window.__humanetteCaptureRefresh.stats().frames >= 3);
    assert.deepEqual(
      await page.screenshot(),
      before,
      'Active refresh must not alter visible pixels',
    );
    await page.waitForTimeout(450);
    const idle = await refresh.stats();
    assert.equal(idle.active, false);
    await page.waitForTimeout(80);
    assert.equal((await refresh.stats()).frames, idle.frames, 'No permanent idle rendering');
    const child = page.frames()[1];
    await child.goto('data:text/html,<input aria-label="Child">');
    await child.waitForFunction(() => window.__humanetteCaptureRefresh);
    await child.getByRole('textbox').pressSequentially('x');
    await page.waitForFunction(
      (count) => window.__humanetteCaptureRefresh.stats().frames > count,
      idle.frames,
    );
    await page.goto('data:text/html,<body>New page</body>');
    await page.waitForFunction(() => window.__humanetteCaptureRefresh);
    await page.keyboard.press('a');
    await page.waitForFunction(() => window.__humanetteCaptureRefresh.stats().frames > 0);
    await refresh.dispose();
    assert.equal(await page.evaluate(() => Boolean(window.__humanetteCaptureRefresh)), false);
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal(page.listenerCount('framenavigated'), 0);
  } finally {
    await refresh?.dispose();
    await browser.close();
  }
});

test(
  'captured typing preserves intermediate letters after cursor arrival',
  { timeout: 60000 },
  async () => {
    await mkdir('test-results/typing-capture-regression', { recursive: true });
    const output = `test-results/typing-capture-regression/${Date.now()}`;
    const { browser, context, preset } = await launchForPreset(chromium, 'vertical');
    const page = await context.newPage();
    let human;
    try {
      await page.setContent(`<!doctype html><style>
      *{box-sizing:border-box}body{margin:0;background:#f6f4ef;color:#292622;font:22px system-ui;display:grid;place-items:center;min-height:100vh}
      main{width:500px;padding:28px}h1{font-size:42px;margin:0 0 10px}p{margin:0 0 28px}
      form{padding:22px;background:#fffdfa;border:1px solid #e0dad0;border-radius:16px}
      label{display:block;margin-bottom:14px}textarea{width:100%;min-height:260px;font:23px/1.6 system-ui;padding:16px;resize:none}
      canvas{position:fixed;left:88px;top:620px;width:216px;height:8px;pointer-events:none}
      </style><main><h1>Leave a note.</h1><p>Keep everyone in the loop.</p>
      <form><label for="message">Message</label><textarea id="message"></textarea></form></main>
      <canvas width="216" height="8"></canvas><script>
      const ctx=document.querySelector('canvas').getContext('2d');window.inputs=[];
      function draw(count){for(let i=0;i<18;i++){ctx.fillStyle=(i===0||(i>1&&((count>>(17-i))&1)))?'#fff':'#000';ctx.fillRect(i*12,0,12,8)}}
      draw(0);document.querySelector('textarea').addEventListener('input',event=>{
        inputs.push({at:performance.now(),trusted:event.isTrusted});draw(inputs.length);
      });</script>`);
      await page.evaluate(() => document.fonts.ready);
      human = await createHuman(page, { scale: 4, seed: 42 });
      const recording = await startRecording(page, preset);
      const text = 'Plan the launch, invite the team. Let’s ship something great!';
      try {
        await human.wait(700);
        await human.type(page.getByLabel('Message'), text);
        assert.equal(await page.getByLabel('Message').inputValue(), text);
        await human.wait(700);
      } finally {
        await recording.stop(`${output}.mp4`);
      }
      const inputs = await page.evaluate(() => inputs);
      assert.ok(inputs.every((event) => event.trusted));
      const row = execFileSync('ffmpeg', [
        '-v',
        'error',
        '-i',
        `${output}.mp4`,
        '-map',
        '0:v:0',
        '-vf',
        'format=gray,crop=432:1:176:1248',
        '-fps_mode',
        'passthrough',
        '-enc_time_base',
        'demux',
        '-f',
        'rawvideo',
        '-',
      ]);
      const counts = [];
      for (let offset = 0; offset + 432 <= row.length; offset += 432) {
        if (row[offset + 12] < 160 || row[offset + 36] > 96) continue;
        let count = 0;
        for (let bit = 0; bit < 16; bit++)
          count = (count << 1) | (row[offset + (bit + 2) * 24 + 12] >= 128 ? 1 : 0);
        if (counts.at(-1) !== count) counts.push(count);
      }
      const jumps = counts.slice(1).map((count, i) => count - counts[i]);
      await writeFile(
        `${output}.json`,
        JSON.stringify({ inputs, counts, maxJump: Math.max(...jumps) }, null, 2),
      );
      assert.equal(counts.at(-1), inputs.length, 'Captured final text must be complete');
      assert.ok(
        Math.max(...jumps) <= 2,
        `Captured typing skipped a burst of ${Math.max(...jumps)} letters`,
      );
    } catch (error) {
      await page.screenshot({ path: `${output}-failed.png` }).catch(() => {});
      throw error;
    } finally {
      await human?.dispose();
      await browser.close();
    }
  },
);
