import { fileURLToPath } from 'node:url';
import type { Page, Locator } from 'playwright-core';
import {
  naturalPoint,
  moveDuration,
  assertPoint,
  type Point,
  type FeedbackOptions,
} from './motion.js';
import type { CursorRenderer, CursorRendererOptions } from './index.js';
import { typingPlan, type TypingOptions } from './typing.js';
export { typingSpeeds, typingPlan } from './typing.js';
export type { TypingOptions, TypingSpeed, TypingPlanOptions, TypingStep } from './typing.js';
type Surface = typeof window & {
  BigCursor: { createCursorRenderer(options: object): CursorRenderer };
  __bigcursor?: CursorRenderer;
};
export type Target = Point | Locator | string;
export interface CursorOptions extends Partial<FeedbackOptions> {
  renderer?: CursorRendererOptions['renderer'];
  seed?: number;
  settle?: number;
  fps?: number;
  keyboard?: boolean;
  typing?: TypingOptions;
}
export interface TypeOptions extends TypingOptions {
  delay?: number;
  selectAll?: boolean;
  signal?: AbortSignal;
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
export async function createCursor(page: Page, config: CursorOptions = {}) {
  const { seed = 42, settle = 120, fps = 60, typing = {}, ...appearance } = config;
  if (!Number.isFinite(fps) || fps < 1 || fps > 240 || !Number.isFinite(settle) || settle < 0)
    throw new RangeError('Use fps 1–240 and a nonnegative settle time.');
  typingPlan('', { ...typing, seed });
  let typingSequence = 0;
  let position: Point = { x: 0, y: 0 },
    disposed = false,
    busy = false,
    cursorHidden = false;
  async function install() {
    if (disposed) throw new Error('Bigcursor automation is disposed.');
    if (!(await page.evaluate(() => Boolean((window as Surface).__bigcursor)))) {
      await page.addScriptTag({
        path: fileURLToPath(new URL('./bigcursor.global.js', import.meta.url)),
      });
      await page.evaluate(
        async ({ appearance, cursorHidden }) => {
          const w = window as Surface;
          w.__bigcursor = w.BigCursor.createCursorRenderer({ ...appearance, follow: true });
          await w.__bigcursor.ready;
          if (cursorHidden) w.__bigcursor.hideCursor();
        },
        { appearance, cursorHidden },
      );
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
        p = naturalPoint(from, to, t, seed);
      await page.mouse.move(p.x, p.y);
      position = p;
      if (t === 1) break;
      await sleep(1000 / fps, opts.signal);
    }
  }
  async function action<T>(fn: () => Promise<T>): Promise<T> {
    if (busy) throw new Error('Await each Bigcursor action; parallel input is ambiguous.');
    if (disposed) throw new Error('Bigcursor automation is disposed.');
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
    type: (target: Target, text: string, opts: TypeOptions = {}) =>
      action(async () => {
        if (typeof text !== 'string') throw new TypeError('Typing text must be a string.');
        if (opts.delay !== undefined && (!Number.isFinite(opts.delay) || opts.delay < 0))
          throw new RangeError('Delay must be nonnegative.');
        const plan =
          opts.delay === undefined
            ? typingPlan(text, {
                seed: seed + typingSequence++,
                speed: opts.speed ?? typing.speed,
                pace: opts.pace ?? (opts.speed === undefined ? typing.pace : undefined),
              })
            : null;
        await move(target, { signal: opts.signal });
        await sleep(settle, opts.signal);
        await page.mouse.click(position.x, position.y);
        if (opts.selectAll) await page.keyboard.press('ControlOrMeta+A');
        if (plan) {
          for (const step of plan) {
            await sleep(step.waitBefore, opts.signal);
            opts.signal?.throwIfAborted();
            if (/^[\x20-\x7e]$/.test(step.text)) {
              await page.keyboard.down(step.text);
              try {
                await sleep(step.hold, opts.signal);
              } finally {
                await page.keyboard.up(step.text);
              }
            } else {
              await page.keyboard.insertText(step.text);
              await sleep(step.hold, opts.signal);
            }
          }
          return;
        }
        for (const char of text) {
          opts.signal?.throwIfAborted();
          await page.keyboard.insertText(char);
          await sleep(opts.delay!, opts.signal);
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
        await page.evaluate((value) => (window as Surface).__bigcursor!.configure(value), next);
        Object.assign(appearance, next);
      }),
    hideCursor: () =>
      action(async () => {
        await install();
        await page.evaluate(() => (window as Surface).__bigcursor!.hideCursor());
        cursorHidden = true;
      }),
    showCursor: () =>
      action(async () => {
        await install();
        await page.evaluate(() => (window as Surface).__bigcursor!.showCursor());
        cursorHidden = false;
      }),
    async dispose() {
      if (busy) throw new Error('Wait for the running action before disposing.');
      disposed = true;
      await page
        .evaluate(() => {
          const w = window as Surface;
          w.__bigcursor?.dispose();
          delete w.__bigcursor;
        })
        .catch(() => {});
    },
  };
}
