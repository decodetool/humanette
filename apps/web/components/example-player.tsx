'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createHumanette,
  typingPlan,
  type TypingSpeed,
  sampleTimeline,
  type Humanette,
  type TimelineEvent,
} from 'humanette/internal';
import { useDemoAudio } from './demo-audio';
export type Scene = 'click' | 'text' | 'drag' | 'typing';
const typedText = 'Make something great.';
const dragWidth = 344;
export function ExamplePlayer({
  scene,
  scale = 4,
  speed = 'default',
}: {
  scene: Scene;
  scale?: number;
  speed?: TypingSpeed;
}) {
  const { audio } = useDemoAudio();
  const strikes = useMemo(() => {
    let at = 1250;
    return typingPlan(typedText, { speed, seed: 42 }).map((step, i) => {
      at += step.waitBefore;
      const start = at;
      at += step.hold;
      return { ...step, at: start, end: at, gesture: `home-typing-${i}` };
    });
  }, [speed]);
  const duration = scene === 'typing' ? Math.max(4800, strikes.at(-1)!.end + 1800) : 4600;
  const cues = useMemo(
    () =>
      scene === 'typing'
        ? [
            { at: 1000, kind: 'click' as const },
            ...strikes.flatMap((step) => [
              { at: step.at, kind: 'press' as const, step },
              { at: step.end, kind: 'release' as const, step },
            ]),
          ].sort((a, b) => a.at - b.at)
        : [{ at: 1000, kind: 'click' as const }],
    [scene, strikes],
  );
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const human = useRef<Humanette | null>(null);
  const clock = useRef(0);
  const startDelay = useRef(scene === 'typing' ? 600 : 0);
  const measure = useRef<() => void>(() => {});
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [geometry, setGeometry] = useState({
    ratio: 1,
    ratioY: 0.25,
    originX: 20,
    left: 0,
    right: 280,
    edges: [0, 280],
  });
  const initial = {
    x: scene === 'text' ? geometry.right + 48 : scene === 'drag' ? 392 : 212,
    y: 160,
  };
  const events: TimelineEvent[] =
    scene === 'typing'
      ? [
          { at: 0, type: 'cursor', cursor: 'auto' },
          { at: 0, type: 'move', x: 64, y: 160, duration: 900 },
          { at: 1000, type: 'down' },
          { at: 1100, type: 'up' },
          { at: 1150, type: 'cursor', cursor: 'text' },
          { at: duration - 1100, type: 'cursor', cursor: 'auto' },
          { at: duration - 1100, type: 'move', ...initial, duration: 900 },
        ]
      : scene === 'click'
        ? [
            { at: 0, type: 'cursor', cursor: 'auto' },
            { at: 0, type: 'move', x: 64, y: 160, duration: 800 },
            { at: 1000, type: 'down' },
            { at: 1100, type: 'up' },
            { at: 2400, type: 'move', ...initial, duration: 1000 },
          ]
        : scene === 'text'
          ? [
              { at: 0, type: 'cursor', cursor: 'auto' },
              { at: 0, type: 'move', x: geometry.left, y: 160, duration: 800 },
              { at: 1000, type: 'down' },
              { at: 1120, type: 'move', x: geometry.right, y: 160, duration: 1400 },
              { at: 2640, type: 'up' },
              { at: 3200, type: 'move', ...initial, duration: 1000 },
            ]
          : [
              { at: 0, type: 'cursor', cursor: 'auto' },
              { at: 0, type: 'move', x: 280, y: 160, duration: 800 },
              { at: 1000, type: 'down' },
              { at: 1000, type: 'cursor', cursor: 'grabbing' },
              { at: 1120, type: 'move', x: 64, y: 160, duration: 1400 },
              { at: 2640, type: 'up' },
              { at: 2640, type: 'cursor', cursor: 'auto' },
              { at: 3200, type: 'move', ...initial, duration: 1000 },
            ];
  const live = useRef({ events, geometry, initial });
  live.current = { events, geometry, initial };
  function draw(at: number) {
    clock.current = at;
    const {
      events,
      initial,
      geometry: { ratio, ratioY, originX },
    } = live.current;
    human.current?.seek(
      events.map((e) =>
        e.type === 'move' ? { ...e, x: e.x * ratio + originX, y: e.y * ratioY } : e,
      ),
      at,
      { x: initial.x * ratio + originX, y: initial.y * ratioY },
    );
    setTime(at);
  }
  useEffect(() => {
    let active = true;
    const h = createHumanette({ root: root.current!, scale });
    human.current = h;
    void h.ready
      .then(() => {
        if (active) {
          setReady(true);
          draw(clock.current);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    const measureGeometry = () => {
      if (!active) return;
      const box = root.current!.getBoundingClientRect();
      // Keep the scenes compact rather than stretching travel to fill the page.
      const ratio = 1;
      if (!box.width) return;
      const bounds = label.current?.getBoundingClientRect();
      const targetBounds = target.current?.getBoundingClientRect();
      const contentWidth = scene === 'drag' ? dragWidth : (targetBounds?.width ?? 128);
      const left = bounds && targetBounds ? bounds.left - targetBounds.left : 0;
      const edges = [0];
      const node = label.current?.firstChild;
      if (node) {
        const range = document.createRange();
        for (let i = 1; i <= (node.textContent?.length ?? 0); i++) {
          range.setStart(node, 0);
          range.setEnd(node, i);
          edges.push(range.getBoundingClientRect().width / ratio);
        }
      }
      setGeometry({
        ratio,
        ratioY: (box.height - 32) / 320,
        originX: (box.width - contentWidth) / 2,
        left,
        right: bounds ? left + bounds.width : 280,
        edges,
      });
    };
    measure.current = measureGeometry;
    measureGeometry();
    const resize = new ResizeObserver(measureGeometry);
    resize.observe(root.current!);
    if (label.current) resize.observe(label.current);
    if (target.current) resize.observe(target.current);
    let intersecting = false;
    const updateVisibility = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(root.current!);
    document.addEventListener('visibilitychange', updateVisibility);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!reduced.matches);
    const onReduced = () => {
      setPlaying(!reduced.matches);
    };
    reduced.addEventListener('change', onReduced);
    return () => {
      active = false;
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
      reduced.removeEventListener('change', onReduced);
      h.dispose();
      human.current = null;
    };
  }, [scene]);
  useEffect(() => {
    human.current?.configure({ scale });
    if (ready) draw(clock.current);
  }, [scale, geometry, ready]);
  useEffect(() => {
    if (scene === 'typing') {
      startDelay.current = 600;
      draw(0);
    }
  }, [scene, speed]);
  useEffect(() => {
    if (!playing || !visible || !ready) return;
    // Refresh after font/style edits and before each take, not on every frame.
    measure.current();
    let frame = 0;
    let last: number | undefined;
    function tick(now: number) {
      // Integrate RAF time, not frame count; freeze while hidden or paused.
      const delta = last === undefined ? 0 : Math.max(0, now - last);
      last = now;
      // Stagger the typing preview while keeping its visuals and sounds on one clock.
      const delay = Math.min(delta, startDelay.current);
      startDelay.current -= delay;
      const next = clock.current + delta - delay;
      function soundBetween(from: number, to: number) {
        for (const cue of cues) {
          if (cue.at <= from || cue.at > to) continue;
          if (cue.kind === 'click') audio.current?.click();
          else if (cue.kind === 'press')
            audio.current?.keyDown(cue.step.text === ' ' ? 'space' : 'printable', cue.step.gesture);
          else audio.current?.keyUp(cue.step.gesture);
        }
      }
      if (next >= duration) {
        soundBetween(clock.current, duration);
        measure.current();
        soundBetween(-1, next % duration);
      } else soundBetween(clock.current, next);
      draw(next % duration);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (scene === 'typing') for (const step of strikes) audio.current?.keyUp(step.gesture);
    };
  }, [playing, visible, ready, duration, cues, audio, strikes, scene]);
  const state = sampleTimeline(events, time, undefined, initial);
  const width = geometry.right - geometry.left;
  const offset = Math.max(0, Math.min(width, state.x - geometry.left));
  const selected = geometry.edges.reduce(
    (nearest, edge) => (Math.abs(edge - offset) < Math.abs(nearest - offset) ? edge : nearest),
    0,
  );
  // Clear as the cursor arrives home, leaving the end-of-loop pause unselected.
  const selectedWidth = time < 1000 || time >= 4200 ? 0 : time >= 2520 ? width : selected;
  const cardX =
    time < 1120
      ? 280
      : time < 2640
        ? state.x
        : time < 3900
          ? 64
          : 64 + 216 * Math.min(1, (time - 3900) / 600);
  return (
    <div
      data-testid={`example-${scene}`}
      data-playback-time={Math.round(time)}
      data-running={playing && visible && ready}
    >
      <div ref={root} data-testid="example-stage" className="relative -mx-5 h-28 overflow-hidden">
        {scene === 'typing' && (
          <div
            ref={target}
            className="field absolute left-1/2 top-[calc(50%-16px)] flex h-12 w-72 -translate-x-1/2 -translate-y-1/2 cursor-text items-center text-base"
            aria-label="Demo title"
            data-testid="example-typing-target"
          >
            <span>
              {strikes
                .filter((step) => step.at <= time)
                .map((step) => step.text)
                .join('')}
            </span>
            {time >= 1000 && time < duration - 1100 && (
              <span aria-hidden className="ml-px h-5 border-l border-ink" />
            )}
            {time < 1000 && <span className="text-muted">Demo title</span>}
          </div>
        )}
        {scene === 'click' && (
          <div
            ref={target}
            data-testid="example-click-target"
            data-hovered={state.x >= 0 && state.x <= 128}
            data-pressed={time >= 1000 && time < 1100}
            className="demo-click-target absolute left-1/2 top-[calc(50%-16px)] flex h-12 w-32 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border text-sm font-medium"
          >
            {time >= 1100 ? 'Clicked' : 'Click me'}
          </div>
        )}
        {scene === 'text' && (
          <div
            ref={target}
            data-testid="example-text-target"
            className="absolute left-1/2 top-[calc(50%-16px)] -translate-x-1/2 -translate-y-1/2 cursor-text whitespace-nowrap text-[1em]"
          >
            Select{' '}
            <span className="relative inline-block">
              <span
                aria-hidden
                data-testid="example-selection"
                className="absolute inset-y-0 left-0 bg-selection"
                style={{ width: selectedWidth * geometry.ratio }}
              />
              <span ref={label} className="relative inline-block">
                these words
              </span>
            </span>
            .
          </div>
        )}
        {scene === 'drag' && (
          <>
            <div
              style={{ left: `calc(50% - ${dragWidth / 2}px)` }}
              className="absolute top-[calc(50%-16px)] flex h-14 w-32 px-6 -translate-y-1/2 items-center justify-center rounded-lg border border-dashed border-muted text-sm text-muted whitespace-nowrap"
            >
              Drop here
            </div>
            <div
              data-testid="example-drag-target"
              style={{ left: `calc(50% - ${dragWidth / 2}px + ${cardX}px)` }}
              className="absolute top-[calc(50%-16px)] flex h-14 w-32 px-6 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-lg border border-line bg-success-surface text-sm font-medium whitespace-nowrap"
            >
              {time >= 2640 && time < 3900 ? 'Delivered ✓' : 'Drag me'}
            </div>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="p-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
