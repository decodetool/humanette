// Adapted and modified from the agent-browser Pointer Lab model (Apache-2.0).
// Public TypeScript API, unbounded CSS coordinates, validation, and new duration heuristic.
// See NOTICE.md and LICENSE-APACHE-2.0.
/** CSS pixels and milliseconds throughout. Pure functions work in Node and browsers. */
export interface Point {
  x: number;
  y: number;
}
export interface FeedbackOptions {
  scale: number;
  color: string;
  filled: boolean;
  pressRadius: number;
  pressDuration: number;
  pressOpacity: number;
  pressScale: number;
  holdRadius: number;
  holdOpacity: number;
  ringWidth: number;
  releaseRadius: number;
  releaseDuration: number;
  motionBlur: number;
  /** Milliseconds without mouse activity before idle dimming; 0 disables idle dimming. */
  autoHideTimeout: number;
  /** Idle cursor opacity; 0 fully hides it, 1 disables idle dimming. */
  hiddenOpacity: number;
  /** Cursor opacity while typing or selecting text; independent of keyboard badges. */
  dimmedOpacity: number;
}
export const defaults: Readonly<FeedbackOptions> = Object.freeze({
  scale: 2.5,
  color: '#397ef3',
  filled: true,
  pressRadius: 16,
  pressDuration: 90,
  pressOpacity: 0.16,
  pressScale: 0.94,
  holdRadius: 30,
  holdOpacity: 0.2,
  ringWidth: 1.5,
  releaseRadius: 48,
  releaseDuration: 200,
  motionBlur: 0.2,
  autoHideTimeout: 0,
  hiddenOpacity: 0,
  dimmedOpacity: 0.3,
});
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
export function assertPoint(p: Point): void {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
    throw new TypeError('Expected finite CSS-pixel x and y.');
}
export function options(input: Partial<FeedbackOptions> = {}): FeedbackOptions {
  const value = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      input[key as keyof FeedbackOptions] ?? fallback,
    ]),
  ) as unknown as FeedbackOptions;
  for (const [key, n] of Object.entries(value)) {
    if (
      typeof defaults[key as keyof FeedbackOptions] === 'number' &&
      (typeof n !== 'number' || !Number.isFinite(n) || n < 0)
    )
      throw new RangeError(`${key} must be finite and nonnegative.`);
  }
  if (value.scale <= 0 || value.pressDuration <= 0 || value.releaseDuration <= 0)
    throw new RangeError('Scale and durations must be positive.');
  for (const key of [
    'pressOpacity',
    'holdOpacity',
    'motionBlur',
    'dimmedOpacity',
    'hiddenOpacity',
  ] as const)
    if (value[key] > 1) throw new RangeError(`${key} must be 0–1.`);
  if (value.autoHideTimeout > 2 ** 31 - 1)
    throw new RangeError('autoHideTimeout must be at most 2147483647 milliseconds.');
  if (typeof value.filled !== 'boolean' || typeof value.color !== 'string')
    throw new TypeError('Invalid appearance options.');
  return value;
}
export const dimmingTimings = Object.freeze({ transition: 180, typingHold: 350 });

/** Short dimming transition after the idle deadline; held pointers keep their feedback. */
export function cursorIdleOpacity(
  idleFor: number,
  pressed: boolean,
  timeout: number,
  targetOpacity: number,
) {
  if (pressed || timeout === 0) return 1;
  const progress = clamp((idleFor - timeout) / dimmingTimings.transition);
  return progress === 1 ? targetOpacity : 1 - progress * (1 - targetOpacity);
}
/** A seeded curve with cubic ease-out: fast departure, deliberate arrival. */
export function humanPoint(from: Point, to: Point, progress: number, seed = 42): Point {
  assertPoint(from);
  assertPoint(to);
  if (!Number.isSafeInteger(seed) || seed < 0 || !Number.isFinite(progress))
    throw new RangeError('Use a nonnegative integer seed and finite progress.');
  const p = easeOut(progress),
    dx = to.x - from.x,
    dy = to.y - from.y,
    d = Math.hypot(dx, dy);
  const mixed = BigInt.asUintN(64, BigInt(seed) * 6364136223846793005n + 1442695040888963407n);
  const bend = ((Number(mixed >> 11n) / 2 ** 53) * 2 - 1) * Math.min(d * 0.08, 36);
  const curve = 4 * p * (1 - p) * bend;
  return {
    x: from.x + dx * p - (d ? (dy / d) * curve : 0),
    y: from.y + dy * p + (d ? (dx / d) * curve : 0),
  };
}
/** Minimum duration prevents tiny moves from snapping. No target-size heuristic yet. */
export const moveDuration = (from: Point, to: Point) => {
  assertPoint(from);
  assertPoint(to);
  return Math.round(
    clamp(240 + Math.sqrt(Math.hypot(to.x - from.x, to.y - from.y)) * 19, 280, 1100),
  );
};
export type TimelineEvent = { at: number } & (
  | { type: 'move'; x: number; y: number; duration: number; seed?: number }
  | { type: 'down' | 'up' }
  | { type: 'cursor'; cursor: string }
  | { type: 'typing'; duration: number }
);
export interface Feedback {
  radius: number;
  opacity: number;
  scale: number;
  phase: 'up' | 'press' | 'hold' | 'release';
}
export function validateTimeline(events: readonly TimelineEvent[]): void {
  if (!Array.isArray(events) || events.length > 1000)
    throw new TypeError('Expected at most 1000 timeline events.');
  let end = 0,
    down = false;
  for (const e of events) {
    if (!e || !Number.isFinite(e.at) || e.at < end)
      throw new RangeError('Events must be ordered and moves must not overlap.');
    if (e.type === 'move') {
      assertPoint(e);
      if (!Number.isFinite(e.duration) || e.duration <= 0)
        throw new RangeError('Move duration must be positive.');
      if (e.seed !== undefined && (!Number.isSafeInteger(e.seed) || e.seed < 0))
        throw new RangeError('Invalid seed.');
      end = e.at + e.duration;
    } else if (e.type === 'typing') {
      if (!Number.isFinite(e.duration) || e.duration <= 0)
        throw new RangeError('Typing duration must be positive.');
      end = e.at;
    } else if (e.type === 'down' || e.type === 'up') {
      if ((e.type === 'down') === down) throw new Error('Down/up must alternate.');
      down = e.type === 'down';
      end = e.at;
    } else if (e.type === 'cursor') {
      if (typeof e.cursor !== 'string' || !e.cursor)
        throw new TypeError('Cursor must be a nonempty string.');
      end = e.at;
    } else throw new TypeError('Unknown timeline event.');
  }
  if (down) throw new Error('Finish with pointer-up.');
}
export const timelineDuration = (
  events: readonly TimelineEvent[],
  config: FeedbackOptions = options(),
) =>
  Math.max(
    0,
    ...events.map((e) => e.at + (e.type === 'move' || e.type === 'typing' ? e.duration : 0)),
  ) +
  Math.max(
    600,
    config.autoHideTimeout > 0 ? config.autoHideTimeout + dimmingTimings.transition : 0,
  );
export function feedbackAt(
  events: readonly TimelineEvent[],
  time: number,
  config: FeedbackOptions = options(),
): Feedback {
  let value = { radius: config.pressRadius, opacity: 0, scale: 1 },
    phase: Feedback['phase'] = 'up';
  let transition:
    { at: number; duration: number; from: typeof value; to: typeof value } | undefined;
  const evaluate = (at: number) => {
    if (!transition) return value;
    const p = easeOut((at - transition.at) / transition.duration);
    return {
      radius: transition.from.radius + (transition.to.radius - transition.from.radius) * p,
      opacity: transition.from.opacity + (transition.to.opacity - transition.from.opacity) * p,
      scale: transition.from.scale + (transition.to.scale - transition.from.scale) * p,
    };
  };
  for (const event of events) {
    if (event.at > time) break;
    if (event.type !== 'down' && event.type !== 'up') continue;
    value = evaluate(event.at);
    if (event.type === 'down') {
      if (value.opacity === 0) value.radius = config.pressRadius;
      value.opacity = Math.max(value.opacity, config.pressOpacity);
      transition = {
        at: event.at,
        duration: config.pressDuration,
        from: value,
        to: { radius: config.holdRadius, opacity: config.holdOpacity, scale: config.pressScale },
      };
      phase = 'press';
    } else {
      transition = {
        at: event.at,
        duration: config.releaseDuration,
        from: value,
        to: { radius: config.releaseRadius, opacity: 0, scale: 1 },
      };
      phase = 'release';
    }
  }
  value = evaluate(time);
  if (transition && time >= transition.at + transition.duration)
    phase = phase === 'press' ? 'hold' : 'up';
  return { ...value, phase };
}
/** Seekable preview; does not dispatch DOM input or change a product's state. */
export function sampleTimeline(
  events: readonly TimelineEvent[],
  time: number,
  config: FeedbackOptions = options(),
  initial: Point = { x: 72, y: 92 },
) {
  let point = { ...initial },
    pressed = false,
    cursor = 'default',
    lastActivity = 0,
    typingUntil = 0;
  for (const e of events) {
    if (e.at > time) break;
    if (e.type === 'move') {
      point = humanPoint(point, e, (time - e.at) / e.duration, e.seed);
      lastActivity = Math.min(time, e.at + e.duration);
      typingUntil = 0;
    } else if (e.type === 'cursor') cursor = e.cursor;
    else if (e.type === 'typing') typingUntil = Math.max(typingUntil, e.at + e.duration);
    else {
      pressed = e.type === 'down';
      lastActivity = e.at;
      typingUntil = 0;
    }
  }
  return {
    ...point,
    pressed,
    cursor,
    typing: time < typingUntil,
    idleFor: time - lastActivity,
    idleOpacity: cursorIdleOpacity(
      time - lastActivity,
      pressed,
      config.autoHideTimeout,
      config.hiddenOpacity,
    ),
    ...feedbackAt(events, time, config),
  };
}
export const scenarios: Record<'click' | 'text' | 'drag', TimelineEvent[]> = {
  click: [
    { at: 0, type: 'move', x: 565, y: 108, duration: 750 },
    { at: 750, type: 'cursor', cursor: 'pointer' },
    { at: 870, type: 'down' },
    { at: 950, type: 'up' },
    { at: 1300, type: 'move', x: 420, y: 185, duration: 560 },
  ],
  text: [
    { at: 0, type: 'move', x: 130, y: 215, duration: 650 },
    { at: 650, type: 'cursor', cursor: 'text' },
    { at: 770, type: 'down' },
    { at: 890, type: 'move', x: 430, y: 215, duration: 1300 },
    { at: 2310, type: 'up' },
    { at: 2700, type: 'move', x: 610, y: 300, duration: 650 },
  ],
  drag: [
    { at: 0, type: 'move', x: 180, y: 310, duration: 700 },
    { at: 700, type: 'cursor', cursor: 'grab' },
    { at: 830, type: 'down' },
    { at: 830, type: 'cursor', cursor: 'grabbing' },
    { at: 950, type: 'move', x: 557, y: 310, duration: 1350 },
    { at: 2420, type: 'up' },
    { at: 2420, type: 'cursor', cursor: 'grab' },
    { at: 2800, type: 'move', x: 610, y: 200, duration: 600 },
  ],
};
