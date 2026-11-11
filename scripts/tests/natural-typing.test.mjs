import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { createCursor } from '../../packages/bigcursor/dist/playwright.js';
import { typingPlan, typingSpeeds } from '../../packages/bigcursor/dist/playwright.js';
import { installInteractionSounds } from '../../packages/bigcursor/dist/recording.js';
import { installTypingSound } from '../../packages/bigcursor/src/recording/typing-sound.js';

test('seeded plans preserve graphemes and pause at language boundaries', () => {
  const text = 'Hello, world. Next line\nDone 👩‍💻!';
  const plan = typingPlan(text, { pace: 1 });
  assert.equal(plan.map((s) => s.text).join(''), text);
  assert.equal(plan.filter((s) => s.text === '👩‍💻').length, 1);
  assert.deepEqual(plan, typingPlan(text, { pace: 1 }));
  assert.notDeepEqual(plan, typingPlan(text, { pace: 1, seed: 7 }));
  assert.ok(new Set(plan.map((s) => s.hold + s.waitBefore)).size > 10, 'Cadence must vary');
  assert.ok(plan.some((s) => s.text === 'w' && s.boundary === 'clause' && s.waitBefore >= 220));
  assert.ok(plan.some((s) => s.text === 'N' && s.boundary === 'sentence' && s.waitBefore >= 450));
  assert.ok(plan.some((s) => s.text === 'D' && s.boundary === 'line' && s.waitBefore >= 480));
  assert.equal(
    typingPlan('https://example.com/a.b 1.25').some((s) => s.boundary === 'sentence'),
    false,
  );
  assert.throws(() => typingPlan('x', { pace: 0 }), RangeError);
  assert.throws(() => typingPlan('x', { pace: 9 }), RangeError);
  assert.throws(() => typingPlan('x', { speed: 'turbo' }), RangeError);
});

test('typing presets accelerate real input timing while preserving text and pauses', () => {
  const text = 'Plan the launch, invite the team. Let’s ship something great!';
  const duration = (plan) => plan.reduce((ms, step) => ms + step.waitBefore + step.hold, 0);
  const slow = typingPlan(text, { speed: 'slow' });
  const normal = typingPlan(text);
  const fast = typingPlan(text, { speed: 'fast' });
  const original = typingPlan(text, { pace: 1 });
  assert.deepEqual(typingSpeeds, { slow: 3, default: 6, fast: 8 });
  assert.deepEqual(slow, typingPlan(text, { pace: 3 }));
  assert.deepEqual(normal, typingPlan(text, { pace: 6 }));
  assert.deepEqual(fast, typingPlan(text, { pace: 8 }));
  assert.ok(Math.abs(duration(slow) / duration(normal) - 2) < 0.2);
  assert.ok(duration(normal) > duration(fast));
  const four = typingPlan(text, { pace: 4 });
  const eight = typingPlan(text, { pace: 8 });
  assert.equal(eight.map((s) => s.text).join(''), text);
  assert.ok(Math.abs(duration(original) / duration(four) - 4) < 0.3);
  assert.ok(Math.abs(duration(original) / duration(eight) - 8) < 0.8);
  assert.ok(
    eight.every((s) => s.hold >= 10),
    'Fast input must still hold and release each key',
  );
  assert.deepEqual(
    normal.map((s) => [s.text, s.boundary]),
    slow.map((s) => [s.text, s.boundary]),
  );
  assert.deepEqual(
    fast.map((s) => [s.text, s.boundary]),
    slow.map((s) => [s.text, s.boundary]),
  );
});

test('rapid keys keep natural sound envelopes and overlapping voices without dropping strokes', async () => {
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  try {
    const page = await browser.newPage();
    await page.evaluate(installTypingSound);
    const result = await page.evaluate(() => {
      const random = Math.random;
      const target = AudioParam.prototype.setTargetAtTime;
      const envelopes = [];
      let clock = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => clock });
      Math.random = () => 0.5;
      AudioParam.prototype.setTargetAtTime = function (value, time, decay) {
        envelopes.push(decay);
        return target.call(this, value, time, decay);
      };
      const sound = window.__bigcursorTypingSound;
      try {
        sound.press('printable', 'one');
        clock += 60;
        sound.press('printable', 'two');
        clock += 25;
        sound.press('printable', 'three');
        for (const key of ['one', 'two', 'three']) sound.release(key);
        return { envelopes, stats: sound.stats() };
      } finally {
        AudioParam.prototype.setTargetAtTime = target;
        Math.random = random;
        delete performance.now;
        sound.dispose();
      }
    });
    assert.equal(result.stats.played, 3);
    assert.equal(result.stats.released, 3);
    assert.equal(result.stats.suppressed, 0);
    assert.equal(result.stats.errors, 0);
    assert.ok(result.stats.activeSources >= 9, 'Rapid key sounds must be allowed to overlap');
    assert.deepEqual(result.envelopes.slice(0, 3), result.envelopes.slice(3, 6));
    assert.deepEqual(result.envelopes.slice(0, 3), result.envelopes.slice(6, 9));
  } finally {
    await browser.close();
  }
});

test(
  'natural timing drives real text and Press audio; cancellation releases a held key',
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: 'chromium',
      ignoreDefaultArgs: ['--mute-audio'],
      args: ['--autoplay-policy=no-user-gesture-required'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(
        '<form><textarea aria-label="Message"></textarea><button>Send</button></form>',
      );
      await page.evaluate(() => {
        window.inputs = [];
        window.keys = [];
        window.submissions = 0;
        document.querySelector('form').onsubmit = (event) => {
          event.preventDefault();
          submissions++;
        };
        document.addEventListener('input', (event) =>
          inputs.push({ trusted: event.isTrusted, time: performance.now() }),
        );
        document.addEventListener('keydown', (event) =>
          keys.push({ type: 'down', code: event.code, trusted: event.isTrusted }),
        );
        document.addEventListener('keyup', (event) =>
          keys.push({ type: 'up', code: event.code, trusted: event.isTrusted }),
        );
      });
      const sounds = await installInteractionSounds(page, { clicks: false });
      const cursor = await createCursor(page);
      try {
        const text = 'One, two.\nNext 👩‍💻!';
        await cursor.type('textarea', text);
        assert.equal(await page.locator('textarea').inputValue(), text);
        assert.equal(
          await page.evaluate(() => submissions),
          0,
          'Literal line breaks must not submit the form',
        );
        const observations = await page.evaluate(() => ({ inputs, keys }));
        assert.ok(observations.inputs.every((i) => i.trusted));
        assert.ok(observations.keys.every((i) => i.trusted));
        const gaps = observations.inputs
          .slice(1)
          .map((entry, i) => entry.time - observations.inputs[i].time);
        assert.ok(Math.max(...gaps) > 75, 'Expected a language-boundary pause at Default speed');
        assert.ok(
          new Set(gaps.map((gap) => Math.round(gap / 5))).size >= 4 &&
            Math.max(...gaps) > 2 * Math.min(...gaps),
          'Actual input cadence must vary',
        );
        const audio = (await sounds.stats())[0].typing;
        assert.equal(audio.theme, 'press');
        assert.equal(audio.errors, 0);
        assert.ok(audio.played >= 10 && audio.released >= 10, 'Press and release must sound');

        await cursor.type('textarea', 'fixed', { delay: 1, selectAll: true });
        assert.equal(
          await page.locator('textarea').inputValue(),
          'fixed',
          'Explicit fixed delay remains usable',
        );
        await page.evaluate(() => {
          keys.length = 0;
        });
        const controller = new AbortController();
        const typing = cursor.type('textarea', 'abcde', { signal: controller.signal });
        await assert.rejects(cursor.wait(0), /parallel input/);
        await assert.rejects(cursor.dispose(), /running action|parallel input/);
        await page.waitForFunction(() => keys.some((k) => k.type === 'down'));
        controller.abort();
        await assert.rejects(typing, { name: 'AbortError' });
        const events = await page.evaluate(() => keys);
        assert.equal(
          events.filter((e) => e.type === 'up').length,
          events.filter((e) => e.type === 'down').length,
          'Abort must release held keyboard input',
        );
      } finally {
        await cursor.dispose();
        await cursor.dispose();
        await sounds.dispose();
      }
      assert.equal(
        await page.evaluate(() =>
          Boolean(window.__bigcursorTypingSound || window.__bigcursorInteractionSounds),
        ),
        false,
      );
      assert.equal(page.listenerCount('framenavigated'), 0);
    } finally {
      await browser.close();
    }
  },
);
