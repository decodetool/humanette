'use client';
import { useState } from 'react';
import { DialRoot, useDialKitController, type DialConfig } from 'dialkit';
import 'dialkit/styles.css';
import {
  defaults,
  options,
  scenarios,
  validateTimeline,
  type TimelineEvent,
  type FeedbackOptions,
} from 'humanette';
import { Preview } from './preview';
const schema = {
  scale: [2.5, 0.5, 5, 0.1],
  color: '#397ef3',
  filled: true as boolean,
  motionBlur: [0.2, 0, 0.6, 0.01],
  textSelectionOpacity: [0.4, 0, 1, 0.05],
  pressRadius: [16, 1, 60, 1],
  pressDuration: [90, 10, 500, 5],
  pressOpacity: [0.16, 0, 1, 0.01],
  pressScale: [0.94, 0.5, 1.2, 0.01],
  holdRadius: [30, 1, 90, 1],
  holdOpacity: [0.2, 0, 1, 0.01],
  ringWidth: [1.5, 0.5, 10, 0.5],
  releaseRadius: [48, 1, 120, 1],
  releaseDuration: [200, 20, 800, 10],
} satisfies DialConfig;
export function Workbench() {
  const controls = useDialKitController('Pointer feel', schema, { id: 'humanette-feel-v1' });
  const config = options(controls.values as unknown as FeedbackOptions);
  const [scenario, setScenario] = useState<'click' | 'text' | 'drag'>('click'),
    [events, setEvents] = useState<TimelineEvent[]>(scenarios.click),
    [time, setTime] = useState(0),
    [json, setJson] = useState(JSON.stringify(scenarios.click, null, 2)),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  function changeScenario(s: typeof scenario) {
    setScenario(s);
    setEvents(scenarios[s]);
    setJson(JSON.stringify(scenarios[s], null, 2));
    setTime(0);
    setError('');
  }
  function apply() {
    try {
      const value = JSON.parse(json);
      validateTimeline(value);
      setEvents(value);
      setTime(0);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  function preset(name: string) {
    controls.setValues(
      name === 'soft'
        ? { ...defaults }
        : name === 'presentation'
          ? { ...defaults, scale: 3, holdRadius: 40, holdOpacity: 0.24, releaseRadius: 64 }
          : {
              ...defaults,
              scale: 1.8,
              filled: false,
              holdRadius: 24,
              holdOpacity: 0.25,
              ringWidth: 1.5,
            },
    );
  }
  function save() {
    const blob = new Blob([JSON.stringify({ version: 1, config, events }, null, 2)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'humanette-preset.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function load(file: File) {
    try {
      const value = JSON.parse(await file.text());
      if (value.version !== 1) throw Error('Expected Humanette preset version 1.');
      const config = options(value.config);
      validateTimeline(value.events);
      controls.setValues({ ...config });
      setEvents(value.events);
      setJson(JSON.stringify(value.events, null, 2));
      setTime(0);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        'createHumanette(' + JSON.stringify(config, null, 2) + ')',
      );
      setNotice('API configuration copied.');
    } catch {
      setNotice('Clipboard unavailable. Use Export preset instead.');
    }
  }
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap justify-between gap-4">
          <div className="flex gap-2">
            {(['click', 'text', 'drag'] as const).map((s) => (
              <button
                className={scenario === s ? 'primary py-2!' : 'secondary py-2!'}
                onClick={() => changeScenario(s)}
                key={s}
              >
                {s === 'text' ? 'Select text' : s === 'drag' ? 'Drag & drop' : 'Click'}
              </button>
            ))}
          </div>
          <span className="eyebrow self-center">REAL PACKAGE · VISUAL PLAYBACK</span>
        </div>
        <Preview events={events} config={config} time={time} onTime={setTime} scenario={scenario} />
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="secondary py-2!" onClick={save}>
            Export preset ↓
          </button>
          <label className="secondary cursor-pointer py-2!">
            Import preset
            <input
              aria-label="Import preset"
              className="sr-only"
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void load(file);
                e.target.value = '';
              }}
            />
          </label>
          <button className="secondary py-2!" onClick={copy}>
            Copy API config
          </button>
        </div>
        <p aria-live="polite" className="mt-3 text-xs text-muted">
          {notice}
        </p>
        <section className="mt-8 rounded-xl border border-line bg-white/35 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Choreograph the moment.</h2>
              <p className="mt-1 text-xs text-muted">
                Edit event times, coordinates, durations, cursor types, and seeds.
              </p>
            </div>
            <button className="primary py-2!" onClick={apply}>
              Apply timeline
            </button>
          </div>
          <div className="mt-5 flex h-10 overflow-hidden rounded-md bg-sage">
            {events.map((e, i) => (
              <button
                key={i}
                title={JSON.stringify(e)}
                className="flex-1 border-r border-paper bg-ink/10 px-1 font-mono text-[10px] hover:bg-accent/20"
                onClick={() => setTime(e.at)}
              >
                {e.type}
                <br />
                {e.at}ms
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="eyebrow">Timeline JSON · CSS pixels on a 720 × 400 stage</span>
            <textarea
              aria-label="Timeline JSON"
              spellCheck={false}
              className="field mt-2 min-h-60 leading-6"
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="mt-3 text-xs leading-6 text-muted">
            Move events may not overlap. Press/release must alternate. Click an event above to
            inspect that moment. Preview playback does not dispatch DOM events; use the Playwright
            adapter for real interactions.
          </p>
        </section>
      </div>
      <aside className="rounded-xl border border-line bg-white/50 p-4 lg:sticky lg:top-6">
        <span className="eyebrow">DIAL IN YOUR SIGNATURE</span>
        <div className="my-4 flex flex-wrap gap-2">
          {[
            ['soft', 'Soft disk'],
            ['presentation', 'Presentation'],
            ['subtle', 'Subtle ring'],
          ].map(([id, title]) => (
            <button
              key={id}
              className="rounded-md border border-line px-2 py-1 text-[10px] hover:bg-sage"
              onClick={() => preset(id)}
            >
              {title}
            </button>
          ))}
        </div>
        <DialRoot mode="inline" theme="light" defaultOpen productionEnabled />
        <p className="mt-4 text-xs leading-6 text-muted">
          Filled feedback sits behind the cursor. Press grows into hold; release expands and fades.
          These values configure the actual package renderer.
        </p>
      </aside>
    </div>
  );
}
