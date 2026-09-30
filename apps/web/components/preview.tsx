'use client';
import { useEffect, useRef, useState } from 'react';
import {
  createHumanette,
  scenarios,
  sampleTimeline,
  options,
  timelineDuration,
  type Humanette,
  type TimelineEvent,
  type FeedbackOptions,
} from 'humanette/internal';
export interface PreviewProps {
  events?: TimelineEvent[];
  config?: Partial<FeedbackOptions>;
  time?: number;
  onTime?: (time: number) => void;
  scenario?: 'click' | 'text' | 'drag';
  compact?: boolean;
}
export function Preview({
  events: given,
  config,
  time,
  onTime,
  scenario = 'click',
  compact = false,
}: PreviewProps) {
  const root = useRef<HTMLDivElement>(null),
    text = useRef<HTMLSpanElement>(null),
    human = useRef<Humanette | null>(null),
    [playing, setPlaying] = useState(false),
    [localTime, setLocalTime] = useState(0),
    [rate, setRate] = useState(1),
    [error, setError] = useState('');
  const [geometry, setGeometry] = useState({
    scale: 1,
    left: 130,
    width: 300,
    y: 215,
    edges: [0, 300],
  });
  const events = given ?? scenarios[scenario],
    duration = timelineDuration(events),
    current = time ?? localTime;
  const live = useRef({ events, config, current, geometry });
  live.current = { events, config, current, geometry };
  function normalized() {
    const { events, geometry: g } = live.current;
    // Built-in choreography follows the measured text. Edited timelines retain
    // their literal stage coordinates.
    return events === scenarios.text
      ? events.map((e) =>
          e.type === 'move' && e.y === 215
            ? { ...e, x: g.left + ((e.x - 130) / 300) * g.width, y: g.y }
            : e,
        )
      : events;
  }
  function mapped() {
    const scale = live.current.geometry.scale;
    return normalized().map((e) =>
      e.type === 'move' ? { ...e, x: e.x * scale, y: e.y * scale } : e,
    );
  }
  const initial = () => {
    const scale = live.current.geometry.scale;
    return { x: 72 * scale, y: 92 * scale };
  };
  useEffect(() => {
    let active = true;
    const h = createHumanette({ root: root.current!, ...live.current.config });
    human.current = h;
    const seek = () => h.seek(mapped(), live.current.current, initial());
    void h.ready
      .then(() => {
        if (active) seek();
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    const observer = new ResizeObserver(() => {
      const stage = root.current!.getBoundingClientRect();
      const label = text.current!;
      const bounds = label.getBoundingClientRect();
      if (!stage.width || !bounds.width) return;
      const scale = stage.width / 720;
      const range = document.createRange();
      const node = label.firstChild!;
      const edges = [0];
      for (let i = 1; i <= (node.textContent?.length ?? 0); i++) {
        range.setStart(node, 0);
        range.setEnd(node, i);
        edges.push(range.getBoundingClientRect().width / scale);
      }
      const g = {
        scale,
        left: (bounds.left - stage.left) / scale,
        width: bounds.width / scale,
        y: (bounds.top + bounds.height / 2 - stage.top) / scale,
        edges,
      };
      live.current.geometry = g;
      setGeometry(g);
      h.stop();
      setPlaying(false);
      seek();
    });
    observer.observe(root.current!);
    observer.observe(text.current!);
    return () => {
      active = false;
      observer.disconnect();
      h.dispose();
      human.current = null;
    };
  }, []);
  useEffect(() => {
    human.current?.stop();
    setPlaying(false);
    setLocalTime(0);
  }, [events]);
  useEffect(() => {
    human.current?.configure(config ?? {});
    human.current?.seek(mapped(), current, initial());
  }, [config, current, events, geometry]);
  function update(t: number) {
    setLocalTime(t);
    onTime?.(t);
  }
  async function play() {
    if (playing) {
      human.current?.stop();
      setPlaying(false);
      return;
    }
    setError('');
    setPlaying(true);
    try {
      await human.current?.play(mapped(), { rate, initial: initial(), onFrame: update });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(String(e));
    } finally {
      setPlaying(false);
    }
  }
  const timeline = normalized();
  const state = sampleTimeline(timeline, current, options(config));
  let anchor: number | undefined;
  let endpoint = state.x;
  if (scenario === 'text') {
    for (const e of timeline) {
      if (e.at > current) break;
      if (e.type === 'down') {
        anchor = sampleTimeline(timeline, e.at).x;
        endpoint = state.x;
      }
      if (e.type === 'up') endpoint = sampleTimeline(timeline, e.at).x;
    }
  }
  const snap = (x: number) =>
    geometry.edges.reduce(
      (nearest, edge) =>
        Math.abs(edge - (x - geometry.left)) < Math.abs(nearest - (x - geometry.left))
          ? edge
          : nearest,
      0,
    );
  const start = anchor === undefined ? 0 : Math.min(snap(anchor), snap(endpoint));
  const end = anchor === undefined ? 0 : Math.max(snap(anchor), snap(endpoint));
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex justify-between border-b border-line bg-sage px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted">
          demo /{' '}
          {scenario === 'text' ? 'text selection' : scenario === 'drag' ? 'drag & drop' : 'click'}
        </span>
        <span className="font-mono text-[11px] text-muted">seed 42</span>
      </div>
      <div
        ref={root}
        data-testid="preview-stage"
        className="preview-surface relative aspect-[720/400] w-full overflow-hidden"
      >
        <div className="absolute left-[7%] top-[13%] text-[clamp(9px,1.1vw,13px)]">
          <span className="eyebrow">EXAMPLE PROJECT</span>
          <p className="mt-3 font-display text-[clamp(20px,3vw,36px)] leading-none">
            A clear next step.
          </p>
        </div>
        <div
          className={`absolute left-[69%] top-[20%] flex h-[14%] w-[20%] items-center justify-center rounded-md text-center text-[clamp(8px,1vw,13px)] leading-tight ${scenario === 'click' && current > 950 ? 'bg-success-surface text-success' : 'bg-accent text-on-accent'}`}
        >
          {scenario === 'click' && current > 950 ? 'Changes saved ✓' : 'Save changes'}
        </div>
        <div className="absolute left-[18%] top-[50%] whitespace-nowrap font-display text-[clamp(14px,2.2vw,25px)]">
          <span
            aria-hidden
            data-testid="selection-highlight"
            className="pointer-events-none absolute inset-0 origin-left bg-selection"
            style={{
              transform: `translateX(${start * geometry.scale}px) scaleX(${(end - start) / geometry.width})`,
            }}
          />
          <span ref={text} data-testid="selection-text" className="relative inline-block">
            Select these words.
          </span>
        </div>
        <div className="absolute left-[68%] top-[71%] flex h-[17%] w-[19%] items-center justify-center rounded-md border border-dashed border-muted bg-sage text-center text-[clamp(8px,1vw,12px)] leading-tight text-muted">
          Drop here
        </div>
        <div
          style={{
            left:
              scenario === 'drag' && current > 950
                ? `${Math.min(68, (state.x / 720) * 100 - 9)}%`
                : '16%',
          }}
          className="absolute top-[71%] flex h-[17%] w-[19%] items-center justify-center rounded-md border border-line bg-success-surface text-[clamp(10px,1vw,13px)]"
        >
          {scenario === 'drag' && current >= 2420 ? 'Delivered ✓' : 'Drag me'}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface px-4 py-3">
        <button className="primary min-w-28 py-2!" onClick={play}>
          {playing ? 'Pause' : 'Play demo'} <span aria-hidden>↗</span>
        </button>
        <input
          className="min-w-16 flex-1 accent-accent"
          aria-label="Timeline position"
          type="range"
          min="0"
          max={duration}
          value={current}
          onChange={(e) => {
            human.current?.stop();
            setPlaying(false);
            update(Number(e.target.value));
          }}
        />
        <span className="font-mono text-[10px] text-muted">
          {(current / 1000).toFixed(1)} / {(duration / 1000).toFixed(1)}s
        </span>
        {!compact && (
          <select
            aria-label="Playback speed"
            className="rounded border border-line p-1 text-xs"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          >
            <option value=".25">¼×</option>
            <option value=".5">½×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
          </select>
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
