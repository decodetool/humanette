// Adapted from the agent-browser recording cursor prototype (Apache-2.0).
// Modified for reusable instances, configurable feedback, themes and timelines.
// See NOTICE.md and LICENSE-APACHE-2.0.
import { cursors, type CursorTheme } from './cursors.js';
import { cursorAt } from './resolve-cursor.js';
import {
  options,
  feedbackAt,
  humanPoint,
  moveDuration,
  validateTimeline,
  sampleTimeline,
  timelineDuration,
  type Point,
  type Feedback,
  type FeedbackOptions,
  type TimelineEvent,
} from './motion.js';
export * from './motion.js';
export * from './cursors.js';
export interface HumanetteOptions extends Partial<FeedbackOptions> {
  /** Inline SVG artwork by default; canvas is retained for capture comparisons. */
  renderer?: 'svg' | 'canvas';
  /** Omit for viewport overlay. A custom root must be positioned, e.g. position:relative. */
  root?: HTMLElement;
  follow?: boolean;
  hideNative?: boolean;
  theme?: CursorTheme;
  /** Explicit opt-in; only modifier chords are displayed, never typed text. */
  keyboard?: boolean;
}
export interface MoveOptions {
  duration?: number;
  seed?: number;
  signal?: AbortSignal;
}
export function createHumanette(input: HumanetteOptions = {}) {
  if (typeof document === 'undefined')
    throw new Error('createHumanette needs a browser. Import is SSR-safe; create it in an effect.');
  let config = options(input),
    theme: CursorTheme = { ...cursors, ...input.theme };
  const root = input.root,
    host = document.createElement('humanette-pointer');
  host.dataset.humanette = '';
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  host.style.cssText = `all:initial!important;position:${root ? 'absolute' : 'fixed'}!important;inset:0!important;overflow:hidden!important;pointer-events:none!important;z-index:2147483646!important;contain:layout style!important;`;
  const shadow = host.attachShadow({ mode: 'closed' }),
    canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  shadow.append(canvas);
  (root ?? document.documentElement).append(host);
  const ctx = canvas.getContext('2d')!;
  const renderer = input.renderer ?? 'svg';
  host.dataset.renderer = renderer;
  // Separate shadow scopes keep SVG filter IDs independent between the trail and cursor.
  const svgLayers = Array.from({ length: 2 }, (_, index) => {
    const layer = document.createElement('div');
    layer.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;display:none;${index === 0 ? 'filter:blur(2.5px);' : ''}`;
    const scope = layer.attachShadow({ mode: 'closed' });
    shadow.append(layer);
    return {
      layer,
      scope,
      template: undefined as SVGSVGElement | undefined,
      svg: undefined as SVGSVGElement | undefined,
      size: -1,
      painted: false,
    };
  });
  const svgTemplates = new Map<string, SVGSVGElement>();
  const bundledSources = new Set(Object.values(cursors).map((asset) => asset.src));
  // Keyboard labels stay above the cursor, as in the original single-canvas ordering.
  const keyCanvas = input.keyboard ? document.createElement('canvas') : undefined;
  const keyContext = keyCanvas?.getContext('2d');
  if (keyCanvas) {
    keyCanvas.style.cssText =
      'position:absolute;left:50%;margin-left:-100px;bottom:24px;width:200px;height:40px;pointer-events:none;display:none;';
    shadow.append(keyCanvas);
  }
  let position: Point = { x: 0, y: 0 },
    visual: Point = { ...position },
    visible = false,
    pressed = false,
    type = 'auto',
    resolved = 'default',
    disposed = false,
    raf = 0,
    last = 0;
  let pressEvents: TimelineEvent[] = [],
    epoch = performance.now(),
    frameOverride: Feedback | null = null;
  let keyLabel = '',
    keyUntil = 0,
    active: AbortController | undefined;
  const images = new Map<string, HTMLImageElement>(),
    removers: (() => void)[] = [];
  let native:
    { element: HTMLElement; value: string; priority: string; applied: string } | undefined;
  function restoreNative() {
    if (native) {
      // Do not clobber a product's cursor change made since our temporary override.
      if (
        native.element.style.getPropertyValue('cursor') === native.applied &&
        native.element.style.getPropertyPriority('cursor') === 'important'
      ) {
        if (native.value) native.element.style.setProperty('cursor', native.value, native.priority);
        else native.element.style.removeProperty('cursor');
      }
      native = undefined;
    }
  }
  function load() {
    const ready = Object.entries(theme).map(async ([name, asset]) => {
      if (
        !asset ||
        !asset.src ||
        ![asset.width, asset.height, ...asset.hotspot].every(Number.isFinite) ||
        asset.width <= 0 ||
        asset.height <= 0 ||
        asset.hotspot.length !== 2
      )
        throw new TypeError(`Invalid cursor asset: ${name}`);
      if (renderer === 'svg' && bundledSources.has(asset.src)) {
        // Only inline our own bundled artwork. Arbitrary theme URLs retain inert image semantics.
        const source = atob(asset.src.slice(asset.src.indexOf(',') + 1));
        const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
        const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
        svg.style.cssText = 'display:block;overflow:visible;pointer-events:none;';
        svgTemplates.set(name, svg);
        images.delete(name);
        return;
      }
      svgTemplates.delete(name);
      const image = new Image();
      images.set(name, image);
      image.src = asset.src;
      await image.decode();
      wake();
    });
    return Promise.all(ready).then(() => {
      wake();
    });
  }
  let ready = load();
  // Keep a rejection handler attached even if a consumer chooses not to await readiness.
  void ready.catch(() => {});
  function dimensions() {
    const b = root?.getBoundingClientRect();
    return {
      w: b?.width ?? innerWidth,
      h: b?.height ?? innerHeight,
      x: b?.left ?? 0,
      y: b?.top ?? 0,
    };
  }
  function refresh() {
    restoreNative();
    if (!visible) return;
    const b = dimensions(),
      hit = cursorAt(position.x + b.x, position.y + b.y);
    const nativeZone = hit.element?.closest('[data-humanette-native]');
    resolved = type === 'auto' ? hit.type : type;
    if (resolved !== 'none' && !theme[resolved]) resolved = 'default';
    host.dataset.cursor = resolved;
    host.style.setProperty('visibility', nativeZone ? 'hidden' : 'visible', 'important');
    if (
      input.follow &&
      input.hideNative !== false &&
      !nativeZone &&
      hit.element instanceof HTMLElement
    ) {
      const el = hit.element;
      const previous = {
        value: el.style.getPropertyValue('cursor'),
        priority: el.style.getPropertyPriority('cursor'),
      };
      el.style.setProperty(
        'cursor',
        `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E") 0 0, ${hit.type}`,
        'important',
      );
      native = { element: el, ...previous, applied: el.style.getPropertyValue('cursor') };
    }
  }
  function draw(now: number) {
    raf = 0;
    if (disposed) return;
    refresh();
    const b = dimensions(),
      dpr = devicePixelRatio || 1;
    const w = Math.ceil(b.w * dpr),
      h = Math.ceil(b.h * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dt = Math.max(1, now - last);
    last = now;
    const previous = { ...visual },
      blend = pressed || frameOverride ? 1 : 1 - Math.exp(-dt / 13);
    visual = {
      x: visual.x + (position.x - visual.x) * blend,
      y: visual.y + (position.y - visual.y) * blend,
    };
    // Feedback stays on a DPR-aware canvas behind the SVG artwork.
    // The canvas renderer remains available to compare recording frame delivery.
    // Clear in bitmap coordinates so every edge pixel is covered, including
    // those rounded up from fractional CSS dimensions at the current DPR.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const f = frameOverride ?? feedbackAt(pressEvents, now - epoch, config);
    const selectingText = pressed && (resolved === 'text' || resolved === 'vertical-text');
    const cursorOpacity = selectingText ? config.textSelectionOpacity : 1;
    host.dataset.cursorOpacity = String(cursorOpacity);
    svgLayers.forEach((slot) => {
      slot.painted = false;
    });
    if (visible && resolved !== 'none') {
      ctx.save();
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = config.color;
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.ringWidth;
      ctx.beginPath();
      ctx.arc(visual.x, visual.y, f.radius, 0, Math.PI * 2);
      config.filled ? ctx.fill() : ctx.stroke();
      ctx.restore();
      const asset = theme[resolved] ?? theme.default,
        image = images.get(resolved),
        template = svgTemplates.get(resolved);
      if (asset && (template || (image?.complete && image.naturalWidth))) {
        const paint = (x: number, y: number, alpha: number, blur = 0) => {
          if (template) {
            const slot = svgLayers[blur ? 0 : 1];
            if (slot.template !== template) {
              slot.svg = template.cloneNode(true) as SVGSVGElement;
              slot.scope.replaceChildren(slot.svg);
              slot.template = template;
              slot.size = -1;
            }
            const scale = config.scale * f.scale;
            // Size the vector viewport instead of upscaling a composited bitmap.
            if (slot.size !== scale) {
              slot.svg!.setAttribute('width', String(asset.width * scale));
              slot.svg!.setAttribute('height', String(asset.height * scale));
              slot.size = scale;
            }
            slot.painted = true;
            slot.layer.style.transform = `translate(${x - asset.hotspot[0] * scale}px,${y - asset.hotspot[1] * scale}px)`;
            slot.layer.style.opacity = String(alpha * cursorOpacity);
            return;
          }
          ctx.save();
          ctx.globalAlpha = alpha * cursorOpacity;
          ctx.filter = blur ? 'blur(' + blur + 'px)' : 'none';
          ctx.translate(x, y);
          ctx.scale(config.scale * f.scale, config.scale * f.scale);
          ctx.drawImage(image!, -asset.hotspot[0], -asset.hotspot[1], asset.width, asset.height);
          ctx.restore();
        };
        const dx = visual.x - previous.x,
          dy = visual.y - previous.y,
          len = Math.hypot(dx, dy),
          speed = len / dt;
        if (len > 0 && config.motionBlur) {
          const distance = Math.min(24, speed * 18);
          paint(
            visual.x - (dx / len) * distance,
            visual.y - (dy / len) * distance,
            Math.min(config.motionBlur, speed * 0.15),
            2.5,
          );
        }
        paint(visual.x, visual.y, 1);
      }
    }
    svgLayers.forEach(({ layer, painted }) => {
      layer.style.display = painted ? 'block' : 'none';
    });
    if (keyCanvas && keyContext) {
      keyCanvas.style.display = keyLabel && now < keyUntil ? 'block' : 'none';
      if (keyLabel && now < keyUntil) {
        const keyWidth = Math.ceil(200 * dpr),
          keyHeight = Math.ceil(40 * dpr);
        if (keyCanvas.width !== keyWidth || keyCanvas.height !== keyHeight) {
          keyCanvas.width = keyWidth;
          keyCanvas.height = keyHeight;
        }
        keyContext.setTransform(1, 0, 0, 1, 0, 0);
        keyContext.clearRect(0, 0, keyCanvas.width, keyCanvas.height);
        keyContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        keyContext.fillStyle = '#1c211ee8';
        keyContext.fillRect(0, 0, 200, 40);
        keyContext.fillStyle = '#fff';
        keyContext.font = '15px monospace';
        keyContext.textAlign = 'center';
        keyContext.fillText(keyLabel, 100, 25);
      }
    }
    host.dataset.phase = f.phase;
    if (
      !frameOverride &&
      (f.phase === 'press' ||
        f.phase === 'release' ||
        (visible && Math.hypot(position.x - visual.x, position.y - visual.y) > 0.05) ||
        (keyLabel && now < keyUntil))
    )
      wake();
  }
  function wake() {
    if (!disposed && !raf) raf = requestAnimationFrame(draw);
  }
  function check() {
    if (disposed) throw new Error('Humanette instance is disposed.');
  }
  function setPosition(p: Point) {
    check();
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
      throw new TypeError('Expected finite CSS-pixel coordinates.');
    position = { ...p };
    if (!visible) visual = { ...p };
    visible = true;
    frameOverride = null;
    wake();
  }
  function down() {
    check();
    if (pressed) return;
    frameOverride = null;
    const now = performance.now();
    const previous = pressEvents.at(-1);
    if (!previous || now - epoch - previous.at >= config.releaseDuration) {
      pressEvents = [];
      epoch = now;
    }
    pressEvents.push({ at: now - epoch, type: 'down' });
    pressed = true;
    visual = { ...position };
    wake();
  }
  function up() {
    check();
    if (!pressed) return;
    frameOverride = null;
    pressEvents.push({ at: performance.now() - epoch, type: 'up' });
    pressed = false;
    visual = { ...position };
    wake();
  }
  function stop() {
    active?.abort();
    active = undefined;
  }
  async function animate(
    duration: number,
    callback: (progress: number) => void,
    signal?: AbortSignal,
  ) {
    check();
    if (!Number.isFinite(duration) || duration <= 0)
      throw new RangeError('Duration must be positive.');
    stop();
    const controller = new AbortController();
    active = controller;
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    try {
      await new Promise<void>((resolve, reject) => {
        let ticket = 0;
        const start = performance.now();
        const cancel = () => {
          cancelAnimationFrame(ticket);
          reject(new DOMException('Playback cancelled', 'AbortError'));
        };
        controller.signal.addEventListener('abort', cancel, { once: true });
        if (controller.signal.aborted) {
          cancel();
          return;
        }
        const tick = (now: number) => {
          // RAF supplies the frame timestamp, which can precede the instant
          // performance.now() sampled playback start. Never emit negative time.
          const p = Math.max(0, Math.min(1, (now - start) / duration));
          try {
            callback(p);
          } catch (error) {
            controller.signal.removeEventListener('abort', cancel);
            reject(error);
            return;
          }
          if (p === 1) {
            controller.signal.removeEventListener('abort', cancel);
            resolve();
          } else ticket = requestAnimationFrame(tick);
        };
        ticket = requestAnimationFrame(tick);
      });
    } finally {
      signal?.removeEventListener('abort', abort);
      if (active === controller) active = undefined;
    }
  }
  function listen(target: EventTarget, name: string, fn: EventListener) {
    target.addEventListener(name, fn, { passive: true, capture: true });
    removers.push(() => target.removeEventListener(name, fn, true));
  }
  if (input.follow) {
    const target = root ?? window;
    const track = (event: Event) => {
      const e = event as PointerEvent;
      if (!e.isTrusted || e.pointerType !== 'mouse') return;
      const b = dimensions();
      setPosition({ x: e.clientX - b.x, y: e.clientY - b.y });
      if (e.buttons && !pressed) down();
      if (!e.buttons && pressed) up();
    };
    for (const name of ['pointermove', 'pointerdown', 'pointerup']) listen(target, name, track);
    listen(target, 'pointerout', (event) => {
      const next = (event as PointerEvent).relatedTarget;
      if (!(next instanceof Node) || (root && !root.contains(next))) {
        visible = false;
        restoreNative();
        wake();
      }
    });
    listen(window, 'blur', () => {
      if (pressed) up();
      visible = false;
      restoreNative();
      wake();
    });
    listen(target, 'pointercancel', () => {
      if (pressed) up();
      wake();
    });
  }
  if (input.keyboard)
    listen(window, 'keydown', (event) => {
      const e = event as KeyboardEvent;
      if (
        !(e.metaKey || e.ctrlKey || e.altKey) ||
        e.key.length > 20 ||
        ['Meta', 'Control', 'Alt', 'Shift'].includes(e.key) ||
        (e.target as HTMLElement)?.closest('input[type=password]')
      )
        return;
      keyLabel = [
        e.metaKey ? '⌘' : '',
        e.ctrlKey ? 'Ctrl' : '',
        e.altKey ? 'Alt' : '',
        e.shiftKey ? 'Shift' : '',
        e.key.toUpperCase(),
      ]
        .filter(Boolean)
        .join(' + ');
      keyUntil = performance.now() + 900;
      wake();
    });
  listen(window, 'resize', wake);
  listen(window, 'scroll', wake);
  const observer = root ? new ResizeObserver(wake) : undefined;
  observer?.observe(root!);
  const poll = setInterval(() => {
    if (visible && !document.hidden && !raf) {
      const old = resolved;
      refresh();
      if (resolved !== old) wake();
    }
  }, 100);
  return {
    get ready() {
      return ready;
    },
    get element() {
      return host;
    },
    get position() {
      return { ...position };
    },
    /** Immediate visual positioning; never dispatches untrusted DOM events. */
    setPosition,
    down,
    up,
    stop,
    configure(next: Partial<FeedbackOptions>) {
      check();
      config = options({ ...config, ...next });
      wake();
    },
    setCursor(cursor: string) {
      check();
      type = cursor;
      wake();
    },
    async setTheme(next: CursorTheme) {
      check();
      theme = { ...theme, ...next };
      ready = load();
      await ready;
    },
    hide() {
      visible = false;
      restoreNative();
      wake();
    },
    async moveTo(target: Point, opts: MoveOptions = {}) {
      await ready;
      const from = { ...position };
      await animate(
        opts.duration ?? moveDuration(from, target),
        (p) => setPosition(humanPoint(from, target, p, opts.seed)),
        opts.signal,
      );
    },
    /** Deterministic rendering for scrubbing/export. Input state remains untouched. */
    seek(events: readonly TimelineEvent[], time: number, initial?: Point) {
      check();
      validateTimeline(events);
      if (!Number.isFinite(time) || time < 0)
        throw new RangeError('Time must be finite and nonnegative.');
      const state = sampleTimeline(events, time, config, initial);
      position = { x: state.x, y: state.y };
      visual = { ...position };
      type = state.cursor;
      visible = true;
      pressed = state.pressed;
      frameOverride = state;
      wake();
    },
    async play(
      events: readonly TimelineEvent[],
      opts: {
        rate?: number;
        signal?: AbortSignal;
        initial?: Point;
        onFrame?: (time: number) => void;
      } = {},
    ) {
      validateTimeline(events);
      await ready;
      const rate = opts.rate ?? 1;
      if (!Number.isFinite(rate) || rate <= 0)
        throw new RangeError('Playback rate must be positive.');
      const duration = timelineDuration(events);
      await animate(
        duration / rate,
        (p) => {
          const time = p * duration;
          const s = sampleTimeline(events, time, config, opts.initial);
          position = { x: s.x, y: s.y };
          visual = { ...position };
          type = s.cursor;
          pressed = s.pressed;
          visible = true;
          frameOverride = s;
          wake();
          opts.onFrame?.(time);
        },
        opts.signal,
      );
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(poll);
      observer?.disconnect();
      removers.forEach((fn) => fn());
      restoreNative();
      images.forEach((i) => {
        i.onload = null;
        i.onerror = null;
      });
      host.remove();
    },
  };
}
export type Humanette = ReturnType<typeof createHumanette>;
