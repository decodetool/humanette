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
} from 'humanette';
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
    human = useRef<Humanette | null>(null),
    [playing, setPlaying] = useState(false),
    [localTime, setLocalTime] = useState(0),
    [rate, setRate] = useState(1),
    [error, setError] = useState('');
  const events = given ?? scenarios[scenario],
    duration = timelineDuration(events),
    current = time ?? localTime;
  const live = useRef({ events, config, current });
  live.current = { events, config, current };
  function mapped() {
    const scale = (root.current?.clientWidth ?? 720) / 720;
    return live.current.events.map((e) =>
      e.type === 'move' ? { ...e, x: e.x * scale, y: e.y * scale } : e,
    );
  }
  const initial = () => {
    const scale = (root.current?.clientWidth ?? 720) / 720;
    return { x: 72 * scale, y: 92 * scale };
  };
  useEffect(() => {
    const h = createHumanette({ root: root.current!, ...live.current.config });
    human.current = h;
    const seek = () => h.seek(mapped(), live.current.current, initial());
    void h.ready.then(seek).catch((e) => setError(String(e)));
    const observer = new ResizeObserver(() => {
      h.stop();
      setPlaying(false);
      seek();
    });
    observer.observe(root.current!);
    return () => {
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
  }, [config, current, events]);
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
  const state = sampleTimeline(events, current, options(config));
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#fafbf7] shadow-[0_16px_50px_-35px_#26302460]">
      <div className="flex justify-between border-b border-line bg-white/70 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-[#e4bdb0]" />
          <i className="h-2 w-2 rounded-full bg-[#e5d7ae]" />
          <i className="h-2 w-2 rounded-full bg-[#bfd1b8]" />
          <span className="ml-4 font-mono text-[10px] text-muted">a small, repeatable moment</span>
        </div>
        <span className="font-mono text-[10px] text-muted">seed 42</span>
      </div>
      <div
        ref={root}
        data-testid="preview-stage"
        className="relative aspect-[720/400] w-full overflow-hidden bg-[radial-gradient(#c8cebf_1px,transparent_1px)] bg-size-[22px_22px]"
      >
        <div className="absolute left-[7%] top-[13%] text-[clamp(9px,1.1vw,13px)]">
          <span className="eyebrow">YOUR NEXT BIG THING</span>
          <p className="mt-3 font-display text-[clamp(20px,3vw,36px)] leading-none">
            Made to be shown.
          </p>
        </div>
        <div
          className={`absolute left-[69%] top-[20%] flex h-[14%] w-[20%] items-center justify-center rounded-lg text-center text-[clamp(8px,1vw,13px)] leading-tight text-white ${scenario === 'click' && current > 950 ? 'bg-[#57805b]' : 'bg-accent'}`}
        >
          {scenario === 'click' && current > 950 ? 'Changes saved ✓' : 'Save changes'}
        </div>
        <div className="absolute left-[18%] top-[50%] font-display text-[clamp(14px,2.2vw,25px)]">
          <span
            style={{ background: scenario === 'text' && current > 890 ? '#c9ddfb' : undefined }}
          >
            Select these words.
          </span>
        </div>
        <div className="absolute left-[68%] top-[71%] flex h-[17%] w-[19%] items-center justify-center rounded-lg border border-dashed border-[#a3b89a] bg-sage/50 text-center text-[clamp(8px,1vw,12px)] leading-tight text-muted">
          Drop something good
        </div>
        <div
          style={{
            left:
              scenario === 'drag' && current > 950
                ? `${Math.min(68, (state.x / 720) * 100 - 9)}%`
                : '16%',
          }}
          className="absolute top-[71%] flex h-[17%] w-[19%] items-center justify-center rounded-lg border border-[#a3b89a] bg-[#e0ead5] text-[clamp(10px,1vw,13px)] shadow-sm"
        >
          {scenario === 'drag' && current >= 2420 ? 'Delivered ✓' : 'Drag me'}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-white/70 px-5 py-4">
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
        <p role="alert" className="p-4 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
