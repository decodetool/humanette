import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { createCursor } from '../../packages/bigcursor/dist/playwright.js';
import {
  PRESETS,
  launchForPreset,
  startRecording,
} from '../../packages/bigcursor/dist/recording.js';
import { installInteractionSounds } from '../../packages/bigcursor/dist/recording.js';
import { verifyNativeRecording } from '../verify-native-recording.mjs';

await mkdir('test-results', { recursive: true });
const output = await mkdtemp(join(process.cwd(), 'test-results/native-recorder-'));
const fixture =
  '<body style="background:#123;color:white"><button>Save</button><input aria-label="Task"><input aria-label="Secret" type="password"><input type="checkbox" aria-label="Complete"><iframe srcdoc="<button>Child</button>"></iframe></body>';
const stats = (page) => page.evaluate(() => window.__bigcursorInteractionSounds.stats());

test(
  'native presets capture exact real dimensions and audible app + live input sounds',
  { timeout: 120000 },
  async () => {
    for (const name of Object.keys(PRESETS)) {
      const { browser, context, preset } = await launchForPreset(chromium, name);
      try {
        const page = await context.newPage();
        await page.setContent(fixture);
        const recording = await startRecording(page, preset);
        const cursor = await createCursor(page);
        try {
          await cursor.type(page.getByLabel('Task'), 'abc', { delay: 45 });
          const before = await stats(page);
          assert.equal(before.keys, 3, 'insertText must sound each character once');
          await page.getByLabel('Task').pressSequentially('d');
          await page.getByLabel('Task').press('Backspace');
          await page.getByLabel('Task').press('Enter');
          await page.getByLabel('Task').press('ArrowLeft');
          assert.equal(
            (await stats(page)).keys,
            7,
            'physical keys must not sound twice or omit special keys',
          );
          await page.getByLabel('Secret').fill('hidden');
          await page.evaluate(() => {
            document
              .querySelector('button')
              .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            document
              .querySelector('input')
              .dispatchEvent(new InputEvent('input', { bubbles: true }));
          });
          assert.equal(
            (await stats(page)).keys,
            7,
            'password and synthetic events must stay silent',
          );
          await page.getByRole('button', { name: 'Save' }).press('a');
          assert.equal(
            (await stats(page)).keys,
            8,
            'printable tool shortcuts must sound without text input',
          );
          await page.getByRole('checkbox').click();
          assert.equal(
            (await stats(page)).keys,
            8,
            'mouse-driven control changes must not sound like typing',
          );
          await page.frameLocator('iframe').getByRole('button').click();
          assert.equal(
            (await page.frames()[1].evaluate(() => window.__bigcursorInteractionSounds.stats()))
              .clicks,
            1,
          );
          await page.evaluate(() => {
            const ac = new AudioContext(),
              osc = ac.createOscillator(),
              gain = ac.createGain();
            osc.frequency.value = 440;
            gain.gain.value = 0.1;
            osc.connect(gain).connect(ac.destination);
            osc.start();
            osc.stop(ac.currentTime + 0.4);
            osc.onended = () => ac.close();
          });
          await page.waitForTimeout(500);
          const file = join(output, `${name}.mp4`);
          const result = await recording.stop(file);
          assert.equal(result.warning, undefined);
          assert.equal(result.audio, true);
          assert.deepEqual(result.sourceSize, preset.frame);
          assert.ok(result.encodedFrames > 5);
          assert.equal(await recording.stop(file), result, 'stop should be idempotent');
          const media = verifyNativeRecording(file, { ...preset.frame, appTones: [440] });
          await writeFile(join(output, `${name}.json`), JSON.stringify({ result, media }, null, 2));
          assert.equal(
            await page.evaluate(() => Boolean(window.__bigcursorInteractionSounds)),
            false,
          );
          assert.equal(await page.evaluate(() => Boolean(window.__bigcursorCaptureRefresh)), false);
          assert.equal(
            await page.frames()[1].evaluate(() => Boolean(window.__bigcursorInteractionSounds)),
            false,
          );
          assert.equal(
            await page.getByLabel('Task').inputValue(),
            'abc',
            'sound injection must not change app state',
          );
        } finally {
          await cursor.dispose();
        }
      } catch (error) {
        for (const page of context.pages())
          await page.screenshot({ path: join(output, `${name}-failed.png`) }).catch(() => {});
        throw error;
      } finally {
        await browser.close();
      }
    }
  },
);

test(
  'sound navigation, disabled controls, and attached window preservation',
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: 'chromium',
      ignoreDefaultArgs: ['--mute-audio'],
    });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await page.setContent(fixture);
      const sounds = await installInteractionSounds(page, { clicks: false, volume: 0.1 });
      await page.getByLabel('Task').click();
      await page.getByLabel('Task').pressSequentially('a');
      assert.equal((await stats(page)).clicks, 0);
      assert.equal((await stats(page)).keys, 1);
      await page.goto(`data:text/html,${encodeURIComponent(fixture)}`);
      await page.waitForFunction(() => window.__bigcursorInteractionSounds);
      await page.getByLabel('Task').pressSequentially('b');
      assert.equal((await stats(page)).keys, 1, 'sound hooks must survive navigation');
      await sounds.dispose();
      assert.equal(page.listenerCount('framenavigated'), 0);
      const cdp = await page.context().newCDPSession(page);
      const before = await cdp.send('Browser.getWindowForTarget');
      const recording = await startRecording(page, 'archive', {
        audio: false,
        sounds: false,
        captureRefresh: false,
      });
      await page.waitForTimeout(300);
      const result = await recording.stop(join(output, 'attached-silent.mp4'));
      assert.equal(result.audio, false);
      assert.ok(result.warning?.includes('unverified'));
      assert.equal(result.sourceSize, null);
      assert.deepEqual(await cdp.send('Browser.getWindowForTarget'), before);
      assert.equal(await page.evaluate(() => Boolean(window.__bigcursorInteractionSounds)), false);
      assert.equal(await page.evaluate(() => Boolean(window.__bigcursorCaptureRefresh)), false);
      await cdp.detach();
    } finally {
      await browser.close();
    }
  },
);

console.log(`Recorder test artifacts: ${output}`);

test(
  'native capture keeps the visible cursor moving after large repaints',
  { timeout: 60000 },
  async () => {
    const { browser, context, preset } = await launchForPreset(chromium, {
      viewport: { width: 1280, height: 800 },
      dpr: 1,
      fps: 60,
    });
    try {
      const page = await context.newPage();
      await page.setContent(
        '<body style="margin:0;background:#16130f"><canvas width="1280" height="800"></canvas></body>',
      );
      await page.addScriptTag({
        path: new URL('../../packages/bigcursor/dist/bigcursor.global.js', import.meta.url)
          .pathname,
      });
      const path = join(output, 'cursor-after-repaint.mp4');
      const recording = await startRecording(page, preset, { audio: false, sounds: false });
      await page.evaluate(async () => {
        const cursor = BigCursor.createCursorRenderer({ scale: 4, motionBlur: 0 });
        await cursor.ready;
        cursor.setCursor('default');
        const scene = document.querySelector('canvas').getContext('2d'),
          start = performance.now();
        await new Promise((resolve) => {
          function tick(now) {
            const elapsed = now - start;
            if (elapsed < 2000) {
              scene.fillStyle = `hsl(${elapsed / 10} 20% 12%)`;
              scene.fillRect(0, 0, 1280, 800);
            }
            cursor.setPosition({
              x: 640 + 300 * Math.sin(elapsed / 500),
              y: 400 + 150 * Math.cos(elapsed / 700),
            });
            if (elapsed < 4000) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
        cursor.dispose();
      });
      await recording.stop(path);
      const times = JSON.parse(
        execFileSync(
          'ffprobe',
          [
            '-v',
            'error',
            '-select_streams',
            'v',
            '-show_frames',
            '-show_entries',
            'frame=best_effort_timestamp_time',
            '-of',
            'json',
            path,
          ],
          { encoding: 'utf8' },
        ),
      ).frames.map((f) => Number(f.best_effort_timestamp_time));
      const pixels = execFileSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-i',
          path,
          '-vf',
          'scale=640:400,format=gray',
          '-fps_mode',
          'passthrough',
          '-enc_time_base',
          'demux',
          '-f',
          'rawvideo',
          '-',
        ],
        { maxBuffer: 128 * 1024 * 1024 },
      );
      const size = 640 * 400,
        positions = [];
      for (let f = 0; f < pixels.length / size; f++) {
        if (times[f] < 2.1 || times[f] > 3.85) continue;
        let x = 0,
          y = 0,
          count = 0;
        for (let p = 0; p < size; p++)
          if (pixels[f * size + p] > 210) {
            x += p % 640;
            y += Math.floor(p / 640);
            count++;
          }
        if (count) positions.push({ t: times[f], x: x / count, y: y / count });
      }
      assert.ok(positions.length >= 70, 'Too few visible cursor frames after the large repaint');
      let last = positions[0],
        maxHoldMs = 0;
      for (const p of positions.slice(1))
        if (Math.hypot(p.x - last.x, p.y - last.y) > 0.6) {
          maxHoldMs = Math.max(maxHoldMs, (p.t - last.t) * 1000);
          last = p;
        }
      const maxGapMs = Math.max(...positions.slice(1).map((p, i) => (p.t - positions[i].t) * 1000));
      await writeFile(
        join(output, 'cursor-motion.json'),
        JSON.stringify({ positions: positions.length, maxGapMs, maxHoldMs }, null, 2),
      );
      assert.ok(
        maxGapMs < 70 && maxHoldMs < 90,
        `Visible cursor stalled: gap ${maxGapMs}ms, hold ${maxHoldMs}ms`,
      );
    } finally {
      await browser.close();
    }
  },
);

test(
  'injected sounds alone produce audible captured audio; media audio survives navigation',
  { timeout: 60000 },
  async () => {
    const { browser, context, preset } = await launchForPreset(chromium, 'archive');
    try {
      const page = await context.newPage();
      await page.setContent(fixture);
      const recording = await startRecording(page, preset);
      await page.getByLabel('Task').pressSequentially('sound', { delay: 70 });
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(100);
      const soundFile = join(output, 'sounds-only.mp4');
      const soundResult = await recording.stop(soundFile);
      assert.ok(soundResult.interactionSounds[0].keys >= 5);
      assert.equal(soundResult.interactionSounds[0].errors, 0);
      verifyNativeRecording(soundFile);

      const mediaRecording = await startRecording(page, preset, { sounds: false });
      // Real HTML media, independent of Web Audio, in addition to the other test's Web Audio tone.
      const samples = 24000,
        wav = Buffer.alloc(44 + samples * 2);
      wav.write('RIFF');
      wav.writeUInt32LE(wav.length - 8, 4);
      wav.write('WAVEfmt ', 8);
      wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20);
      wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(48000, 24);
      wav.writeUInt32LE(96000, 28);
      wav.writeUInt16LE(2, 32);
      wav.writeUInt16LE(16, 34);
      wav.write('data', 36);
      wav.writeUInt32LE(samples * 2, 40);
      for (let i = 0; i < samples; i++)
        wav.writeInt16LE(Math.round(5000 * Math.sin((i * 2 * Math.PI * 880) / 48000)), 44 + i * 2);
      const source = `data:audio/wav;base64,${wav.toString('base64')}`;
      await page.evaluate(async (src) => {
        window.appAudio = new Audio(src);
        await window.appAudio.play();
      }, source);
      await page.waitForTimeout(600);
      await page.goto(`data:text/html,${encodeURIComponent(fixture)}`);
      await page.evaluate(async (src) => {
        window.appAudio = new Audio(src);
        await window.appAudio.play();
      }, source);
      await page.waitForTimeout(600);
      const mediaFile = join(output, 'media-navigation.mp4');
      const mediaResult = await mediaRecording.stop(mediaFile);
      assert.equal(mediaResult.interactionSounds, undefined);
      verifyNativeRecording(mediaFile, { appTones: [880] });
      assert.equal(await page.evaluate(() => Boolean(window.__bigcursorInteractionSounds)), false);
    } catch (error) {
      for (const page of context.pages())
        await page.screenshot({ path: join(output, 'audio-failed.png') }).catch(() => {});
      throw error;
    } finally {
      await browser.close();
    }
  },
);

test(
  'native video captures cursor dimming levels and full hiding',
  { timeout: 60000 },
  async () => {
    const profile = { viewport: { width: 640, height: 400 }, dpr: 1, fps: 60 };
    const { browser, context, preset } = await launchForPreset(chromium, profile);
    try {
      const page = await context.newPage();
      await page.setContent(
        '<body style="margin:0;background:#123"><input aria-label="Title" style="position:absolute;left:0;top:100px;box-sizing:border-box;width:600px;height:100px;padding:20px;border:0;background:#123;color:white"></body>',
      );
      const cursor = await createCursor(page, {
        motionBlur: 0,
        autoHideTimeout: 500,
        hiddenOpacity: 0.5,
      });
      const recording = await startRecording(page, preset, { sounds: false, audio: false });
      try {
        await cursor.click(page.getByLabel('Title'));
        await page.waitForTimeout(150);
        await page.keyboard.type('Hello', { delay: 80 });
        await page.waitForTimeout(900);
        await cursor.configure({ hiddenOpacity: 0.25 });
        await page.waitForTimeout(400);
        await cursor.configure({ hiddenOpacity: 0 });
        await page.waitForFunction(
          () => document.querySelector('[data-bigcursor]').dataset.cursorOpacity === '0',
        );
        await page.waitForTimeout(300);
        const file = join(output, 'idle-cursor.mp4');
        await recording.stop(file);
        // Decode every source frame: capture timestamps need not share Node's
        // start instant. Crop excludes typed text and the browser focus outline.
        const pixels = execFileSync(
          'ffmpeg',
          [
            '-v',
            'error',
            '-i',
            file,
            '-vf',
            'crop=160:80:220:110',
            '-pix_fmt',
            'rgb24',
            '-fps_mode',
            'passthrough',
            '-f',
            'rawvideo',
            '-',
          ],
          { maxBuffer: 32 * 1024 * 1024 },
        );
        const size = 160 * 80 * 3;
        const peaks = [];
        for (let at = 0; at + size <= pixels.length; at += size) {
          let peak = 0;
          for (let i = at; i < at + size; i += 3) peak = Math.max(peak, pixels[i]);
          peaks.push(peak);
        }
        const full = peaks.findIndex((value) => value > 230);
        const dimmed = peaks.findIndex((value, i) => i > full && value > 110 && value < 170);
        const custom = peaks.findIndex((value, i) => i > dimmed && value > 55 && value < 100);
        const result = { frames: peaks.length, full, dimmed, custom, last: peaks.at(-1), peaks };
        await writeFile(join(output, 'idle-cursor.json'), JSON.stringify(result, null, 2));
        assert.ok(full >= 0, 'Visible cursor missing from native video');
        assert.ok(dimmed > full, 'Configured 0.5 cursor dimming missing from native video');
        assert.ok(custom > dimmed, 'Custom 0.25 idle dimming missing from native video');
        assert.ok(result.last < 40, 'Hidden cursor still obstructs the field in native video');
      } finally {
        await cursor.dispose();
        await recording.stop(join(output, 'idle-cursor.mp4'));
      }
    } catch (error) {
      for (const page of context.pages())
        await page.screenshot({ path: join(output, 'idle-cursor-failed.png') }).catch(() => {});
      throw error;
    } finally {
      await browser.close();
    }
  },
);
