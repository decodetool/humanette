import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    audioAudit: { contexts: AudioContext[]; starts: number; peak: number };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.audioAudit = { contexts: [], starts: 0, peak: 0 };
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.audioAudit.contexts.push(this);
      }
    };
    const connect = AudioNode.prototype.connect;
    // Measure actual samples delivered to the output, rather than relying on
    // UI state, audio-track presence, or synthesis calls alone.
    AudioNode.prototype.connect = function (this: AudioNode, ...args: Parameters<typeof connect>) {
      const destination = args[0];
      if (destination instanceof AudioDestinationNode) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 2048;
        Reflect.apply(connect, this, [analyser]);
        const data = new Float32Array(analyser.fftSize);
        const sample = () => {
          analyser.getFloatTimeDomainData(data);
          for (const value of data)
            window.audioAudit.peak = Math.max(window.audioAudit.peak, Math.abs(value));
          if (this.context.state !== 'closed') requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }
      return Reflect.apply(connect, this, args);
    } as typeof connect;
    for (const prototype of [AudioBufferSourceNode.prototype, OscillatorNode.prototype]) {
      const start = prototype.start;
      prototype.start = function (...args: Parameters<typeof start>) {
        window.audioAudit.starts++;
        return Reflect.apply(start, this, args);
      };
    }
  });
});

test('homepage typing uses natural presets and audible package sounds only after opt-in', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#examples');
  expect(await page.evaluate(() => window.audioAudit.contexts.length)).toBe(0);
  const typing = page.getByTestId('example-typing');
  await typing.scrollIntoViewIfNeeded();
  await expect(typing).toHaveAttribute('data-running', 'false');
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(() => window.audioAudit.contexts.map((c) => c.state))).toEqual([
    'running',
    'running',
  ]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await typing.scrollIntoViewIfNeeded();
  await expect(typing).toHaveAttribute('data-running', 'true');
  const target = page.getByTestId('example-typing-target');
  await expect.poll(async () => (await target.textContent())?.startsWith('Make ')).toBe(true);
  await expect(target).toHaveText('Make something great.');
  expect(await page.evaluate(() => window.audioAudit.peak)).toBeGreaterThan(0.001);
  expect(await page.evaluate(() => window.audioAudit.starts)).toBeGreaterThan(30);
  for (const speed of ['slow', 'fast']) {
    await page.getByLabel('Typing speed', { exact: true }).selectOption(speed);
    await expect(
      page.getByRole('region', { name: 'Natural typing', exact: true }).locator('pre'),
    ).toContainText(`speed: '${speed}'`);
    await typing.scrollIntoViewIfNeeded();
    await expect(target).toHaveText('Make something great.');
  }
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioAudit.contexts.map((c) => c.state)))
    .toEqual(['closed', 'closed']);
  const starts = await page.evaluate(() => window.audioAudit.starts);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.audioAudit.starts)).toBe(starts);
  await page.screenshot({ path: 'test-results/home-typing-audio.png', fullPage: true });
});

test('live demo and workbench share audible effects and mute cleans up contexts', async ({
  page,
}) => {
  await page.goto('/examples/live');
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await page.locator('#save').click();
  await expect(page.locator('#save')).toHaveText('Changes saved');
  await expect.poll(() => page.evaluate(() => window.audioAudit.peak)).toBeGreaterThan(0.0001);
  await page.evaluate(() => {
    window.audioAudit.peak = 0;
  });
  await page
    .getByLabel('Demo name', { exact: true })
    .pressSequentially('Real typing', { delay: 45 });
  await expect.poll(() => page.evaluate(() => window.audioAudit.peak)).toBeGreaterThan(0.001);
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioAudit.contexts.every((c) => c.state === 'closed')))
    .toBe(true);
  await page.goto('/workbench');
  expect(await page.evaluate(() => window.audioAudit.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await page.getByRole('button', { name: 'Play demo' }).click();
  await expect.poll(() => page.evaluate(() => window.audioAudit.peak)).toBeGreaterThan(0.0001);
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.audioAudit.contexts.every((c) => c.state === 'closed')))
    .toBe(true);
});
