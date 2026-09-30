import { fileURLToPath } from 'node:url';
import type { Page, Locator } from 'playwright-core';
import {
  humanPoint,
  moveDuration,
  assertPoint,
  type Point,
  type FeedbackOptions,
} from './motion.js';
import type { Humanette, HumanetteOptions } from './index.js';
type Surface = typeof window & {
  Humanette: { createHumanette(options: object): Humanette };
  __humanette?: Humanette;
};
export type Target = Point | Locator | string;
export interface AutomationOptions extends Partial<FeedbackOptions> {
  renderer?: HumanetteOptions['renderer'];
  seed?: number;
  settle?: number;
  fps?: number;
  keyboard?: boolean;
}
export interface ActionOptions {
  duration?: number;
  signal?: AbortSignal;
}
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
/** Real Playwright mouse/keyboard input. Visual playback and real input stay distinct. */
export async function createHuman(page: Page, config: AutomationOptions = {}) {
  const { seed = 42, settle = 120, fps = 60, ...appearance } = config;
  if (!Number.isFinite(fps) || fps < 1 || fps > 240 || !Number.isFinite(settle) || settle < 0)
    throw new RangeError('Use fps 1–240 and a nonnegative settle time.');
  let position: Point = { x: 0, y: 0 },
    disposed = false,
    busy = false;
  async function install() {
    if (disposed) throw new Error('Humanette automation is disposed.');
    if (!(await page.evaluate(() => Boolean((window as Surface).__humanette)))) {
      await page.addScriptTag({
        path: fileURLToPath(new URL('./humanette.global.js', import.meta.url)),
      });
      await page.evaluate(async (appearance) => {
        const w = window as Surface;
        w.__humanette = w.Humanette.createHumanette({ ...appearance, follow: true });
        await w.__humanette.ready;
      }, appearance);
    }
  }
  async function point(target: Target): Promise<Point> {
    if (typeof target !== 'string' && 'x' in target) {
      assertPoint(target);
      return target;
    }
    const locator = typeof target === 'string' ? page.locator(target) : target;
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box || !box.width || !box.height) throw new Error('Target has no visible hit area.');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  async function move(target: Target, opts: ActionOptions = {}) {
    await install();
    const to = await point(target),
      from = { ...position },
      duration = opts.duration ?? moveDuration(from, to);
    if (!Number.isFinite(duration) || duration <= 0)
      throw new RangeError('Duration must be positive.');
    const started = performance.now();
    // Sample elapsed time, not frame index. Never queue a stale backlog of CDP moves.
    while (true) {
      opts.signal?.throwIfAborted();
      const t = Math.min(1, (performance.now() - started) / duration),
        p = humanPoint(from, to, t, seed);
      await page.mouse.move(p.x, p.y);
      position = p;
      if (t === 1) break;
      await sleep(1000 / fps, opts.signal);
    }
  }
  async function action<T>(fn: () => Promise<T>): Promise<T> {
    if (busy) throw new Error('Await each Humanette action; parallel input is ambiguous.');
    if (disposed) throw new Error('Humanette automation is disposed.');
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  }
  await install();
  return {
    moveTo: (target: Target, opts?: ActionOptions) => action(() => move(target, opts)),
    click: (target: Target, opts: ActionOptions = {}) =>
      action(async () => {
        await move(target, opts);
        await sleep(settle, opts.signal);
        await page.mouse.down();
        try {
          await sleep(70, opts.signal);
        } finally {
          await page.mouse.up();
        }
      }),
    drag: (from: Target, to: Target, opts: ActionOptions = {}) =>
      action(async () => {
        await move(from, { signal: opts.signal });
        await sleep(settle, opts.signal);
        await page.mouse.down();
        try {
          await sleep(90, opts.signal);
          await move(to, { ...opts, duration: opts.duration ?? 900 });
          await sleep(80, opts.signal);
        } finally {
          await page.mouse.up();
        }
      }),
    /** Select rendered text with real mouse input, including nested text nodes and wrapped lines. */
    selectText: (target: Locator | string, opts: ActionOptions = {}) =>
      action(async () => {
        const locator = typeof target === 'string' ? page.locator(target) : target;
        await locator.waitFor({ state: 'visible' });
        await locator.scrollIntoViewIfNeeded();
        const bounds = await locator.evaluate((element) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const rects: DOMRect[] = [];
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            rects.push(
              ...Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0),
            );
          }
          const first = rects[0],
            last = rects[rects.length - 1];
          if (!first || !last) throw new Error('Target has no visible selectable text.');
          return {
            from: { x: first.left + 0.5, y: first.top + first.height / 2 },
            to: { x: last.right - 0.5, y: last.top + last.height / 2 },
          };
        });
        await move(bounds.from, { signal: opts.signal });
        await sleep(settle, opts.signal);
        await page.mouse.down();
        try {
          await sleep(90, opts.signal);
          await move(bounds.to, { ...opts, duration: opts.duration ?? 1400 });
          await sleep(80, opts.signal);
        } finally {
          await page.mouse.up();
        }
      }),
    /** Type through real keyboard input; selectAll replaces editor contents without a leading newline. */
    type: (
      target: Target,
      text: string,
      opts: { delay?: number; selectAll?: boolean; signal?: AbortSignal } = {},
    ) =>
      action(async () => {
        await move(target, { signal: opts.signal });
        await sleep(settle, opts.signal);
        await page.mouse.click(position.x, position.y);
        if (opts.selectAll) await page.keyboard.press('ControlOrMeta+A');
        for (const char of text) {
          opts.signal?.throwIfAborted();
          await page.keyboard.insertText(char);
          await sleep(opts.delay ?? 45, opts.signal);
        }
      }),
    press: (key: string) =>
      action(async () => {
        await install();
        await page.keyboard.press(key);
      }),
    wait: (ms: number, signal?: AbortSignal) =>
      action(async () => {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Wait must be nonnegative.');
        await sleep(ms, signal);
      }),
    configure: (next: Partial<FeedbackOptions>) =>
      action(async () => {
        await install();
        await page.evaluate((value) => (window as Surface).__humanette!.configure(value), next);
      }),
    async dispose() {
      if (busy) throw new Error('Wait for the running action before disposing.');
      disposed = true;
      await page
        .evaluate(() => {
          const w = window as Surface;
          w.__humanette?.dispose();
          delete w.__humanette;
        })
        .catch(() => {});
    },
  };
}
