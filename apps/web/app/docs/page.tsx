import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'API & recording guide' };
const browser = [
  "import { createHumanette } from 'humanette';",
  '',
  'const pointer = createHumanette({ follow: true, scale: 2.5 });',
  'await pointer.ready;',
  '// It follows real input and resolves CSS cursor changes.',
  '// Clean up on unmount / when capture ends:',
  'pointer.dispose();',
].join(String.fromCharCode(10));
const automation = [
  "import { createHuman } from 'humanette/playwright';",
  '',
  'const human = await createHuman(page, { seed: 42, settle: 120 });',
  "await human.click(page.getByRole('button', { name: 'Save' }));",
  "await human.type('#title', 'Start', { selectAll: true });",
  "await human.drag('#card', '#drop-zone', { duration: 1100 });",
  "await human.press('Shift+2');",
  'await human.dispose();',
].join(String.fromCharCode(10));
const api = [
  [
    'createHumanette(options)',
    'Create the visual overlay. follow tracks real mouse input; root scopes a visual preview to a positioned container. Await ready to preload images.',
  ],
  [
    'moveTo({x,y}, {duration,seed,signal})',
    'Move the visual pointer along a seeded, elapsed-time curve. Coordinates are CSS pixels relative to root, or the viewport without root. Does not click DOM elements.',
  ],
  [
    'setPosition(point), down(), up()',
    'Drive visual position and independent press/hold/release feedback from your own automation adapter.',
  ],
  [
    'configure(options), setCursor(type), setTheme(theme)',
    'Change appearance or artwork at runtime. Theme entries contain src, width, height, and hotspot:[x,y] in source SVG coordinates.',
  ],
  [
    'play(events, {rate,signal,onFrame}), seek(events, time)',
    'Play or scrub a deterministic visual timeline. Events are move, down, up, and cursor; at and duration use milliseconds.',
  ],
  [
    'stop(), hide(), dispose()',
    'Cancel visual playback, hide the pointer, or remove the canvas, styles, timers, and listeners.',
  ],
  [
    'createHuman(page, options)',
    'Playwright adapter. Real mouse and keyboard input with click, drag, type, press, wait, configure, and moveTo. Await actions serially.',
  ],
  [
    'humanPoint(), sampleTimeline(), feedbackAt()',
    'Pure math for reproducible positions, seekable choreography, and quick-click-continuous feedback. Import from humanette/motion for no asset payload.',
  ],
];
export default function Docs() {
  return (
    <div className="shell grid gap-12 pt-14 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="text-sm text-muted lg:sticky lg:top-8 lg:self-start">
        <p className="eyebrow mb-5">FIELD NOTES / V1.1</p>
        <nav className="flex flex-wrap gap-4 lg:flex-col">
          {[
            ['start', 'Get started'],
            ['automation', 'Real automation'],
            ['api', 'API reference'],
            ['recording', 'Better recordings'],
            ['limits', 'Honest limits'],
          ].map(([id, label]) => (
            <a key={id} href={'#' + id}>
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <article className="min-w-0 max-w-4xl">
        <h1 className="font-display text-6xl tracking-tight">Give your code a hand.</h1>
        <p className="mt-5 text-lg leading-8 text-muted">
          Humanette renders intent. Your automation drives the product. Your recording tool captures
          the result.
        </p>
        <section id="start" className="mt-12">
          <h2 className="font-display text-3xl">01 / Get started</h2>
          <pre className="my-5 overflow-x-auto rounded-lg bg-sage p-5 text-sm">
            npm install humanette
          </pre>
          <p className="text-sm leading-7 text-muted">
            The browser entry is framework-independent and safe to import during SSR. Create it in a
            React effect or after a page has loaded. All SVG artwork is embedded; no asset server is
            required.
          </p>
          <Code text={browser} />
          <p className="text-sm leading-7 text-muted">
            No bundler? Copy <code>humanette/dist/humanette.global.js</code> from your installed
            package into your public directory, include it with a script tag, then call{' '}
            <code>Humanette.createHumanette()</code>. Respect your site’s CSP.
          </p>
        </section>
        <section id="automation" className="mt-12">
          <h2 className="font-display text-3xl">02 / Real actions, not pretend clicks</h2>
          <Code text={automation} />
          <p className="text-sm leading-7 text-muted">
            Install Playwright separately. Selectors or locators resolve to centered targets after
            scrolling into view. Pointer travel starts fast, slows to aim, then settles for 120 ms
            before clicking. Drag uses real down/move/up and always releases, even on cancellation.
            Pass an AbortSignal to interrupt movement, clicks, dragging, or typing.
          </p>
        </section>
        <section id="api" className="mt-12">
          <h2 className="font-display text-3xl">03 / The whole toolkit</h2>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {api.map(([name, description]) => (
              <div key={name} className="py-5">
                <h3 className="break-words font-mono text-xs text-accent">{name}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-muted">
            Feedback options: scale, color, filled, motionBlur; pressRadius, pressDuration,
            pressOpacity, pressScale; holdRadius, holdOpacity, ringWidth; releaseRadius,
            releaseDuration.{' '}
            <Link href="/workbench" className="text-accent underline">
              Tune them in Pointer Lab
            </Link>{' '}
            and export the actual configuration.
          </p>
        </section>
        <section id="recording" className="mt-12">
          <h2 className="font-display text-3xl">04 / Make a good take</h2>
          <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-7 text-muted">
            <li>
              Prepare authentication, selectors, assets, and target geometry before capture.
              Rehearse once. Run one deterministic script, not an agent decision loop between
              actions.
            </li>
            <li>
              Start with a 1280 × 800 CSS viewport at deviceScaleFactor 2. Inspect the actual
              capture dimensions: a larger output file can still be an upscale of a low-resolution
              source.
            </li>
            <li>
              Use short, purposeful pauses. About 120 ms to settle before clicking. Wait for UI
              readiness outside the take. Avoid multi-second sleeps between actions.
            </li>
            <li>
              Use one stable DPR-aware canvas. Feedback stays behind the icon; held feedback is
              static. A dragging pointer follows input exactly rather than lagging behind an object.
            </li>
            <li>
              For rich-text shape labels, enter editing, select all inside the editor, insert text,
              and exit. Do not send a second Enter that creates a leading paragraph.
            </li>
            <li>
              Record an end hold and verify outcomes afterwards: exact labels, colors, selection,
              and drop destination. Keep the script, seed, config, app revision, and viewport with
              each take.
            </li>
          </ol>
        </section>
        <section id="limits" className="mt-12 rounded-xl border border-line bg-white/40 p-7">
          <h2 className="font-display text-3xl">What it does. What it doesn’t.</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Humanette is not a video encoder and cannot guarantee 60 distinct captured frames per
            second. CDP acknowledgements, the page workload, browser throttling, and your recorder
            still matter. High-FPS metadata is not proof of smooth capture. The cursor is composited
            in the page during capture, not afterwards.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            CSS auto uses conservative text inference. Closed shadow roots, cross-origin frames,
            native menus, and custom URL cursor images cannot be fully inferred. Install an overlay
            inside frames you control. Wait/progress artwork is currently static. SVG hotspots are
            visually calibrated. Visual play/seek never synthesizes product state; use createHuman
            for real automation.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Keyboard badges are opt-in and show modifier chords only, not typed text. They are
            disabled by default. No telemetry, no recording uploads, no third-party asset requests.
          </p>
        </section>
      </article>
    </div>
  );
}
function Code({ text }: { text: string }) {
  return (
    <pre className="my-5 overflow-x-auto rounded-xl bg-ink p-6 font-mono text-xs leading-7 text-[#d7e4ca]">
      <code>{text}</code>
    </pre>
  );
}
