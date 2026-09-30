import type { Metadata } from 'next';
import Link from 'next/link';
import { CodeBlock } from '../../components/code-block';
export const metadata: Metadata = { title: 'Docs' };
const setup = `import { chromium } from 'playwright';
import { createHuman } from 'humanette';

const browser = await chromium.launch({ headless: false });
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000'); // Your app
  const human = await createHuman(page, { scale: 4 });

  try {
    await human.click(page.getByRole('button', { name: 'Save' }));
    await human.type(page.getByLabel('Title'), 'Start', { selectAll: true });
    await human.selectText(page.getByText('Select these words.'));
    await human.drag(page.getByTestId('card'), page.getByTestId('drop'));
  } finally {
    await human.dispose();
  }
} finally {
  await browser.close();
}`;
const recording = `import { chromium } from 'playwright';
import { createHuman } from 'humanette';

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: 'out',
      size: { width: 1280, height: 800 },
    },
  });
  const page = await context.newPage();
  const video = page.video()!;
  try {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Save' }).waitFor();
    const human = await createHuman(page, { scale: 4, seed: 42 });
    try {
      await human.click(page.getByRole('button', { name: 'Save' }));
      await human.wait(600); // Brief hold on the result
    } finally {
      await human.dispose();
    }
  } finally {
    await context.close(); // Finalize the video before saving
  }
  await video.saveAs('out/demo.webm');
  await video.delete(); // Remove Playwright’s generated filename
} finally {
  await browser.close();
}`;
const api = [
  [
    'createHuman(page, options?)',
    'Attach to your existing Playwright page. Options include scale (cursor size), seed (repeatable paths), settle (aim pause, 120 ms by default), and fps (input sampling target, not recording FPS).',
  ],
  [
    'human.click(target, { duration?, signal? })',
    'Move to the target, slow down on approach, pause to aim, then send real mouse down/up.',
  ],
  [
    'human.moveTo(target, { duration?, signal? })',
    'Move without clicking. A locator resolves to its center after scrolling into view. Coordinates are CSS pixels relative to the main viewport.',
  ],
  [
    'human.selectText(locator, { duration?, signal? })',
    'Drag from the first visible text line to the last. Accepts a locator or selector for ordinary selectable text, including nested spans and wrapped lines. For inputs, use type with selectAll or a keyboard shortcut.',
  ],
  [
    'human.drag(from, to, { duration?, signal? })',
    'Move to the source, hold the mouse, drag to the destination, then release. Sources and destinations may be locators, selectors, or coordinates. The mouse is released even when the drag is cancelled.',
  ],
  [
    'human.type(target, text, { delay?, selectAll?, signal? })',
    'Click the target and insert text through Playwright keyboard input. Set selectAll to replace existing contents. Delay is per character in milliseconds.',
  ],
  [
    'human.press(key)',
    'Send a Playwright keyboard shortcut, for example ControlOrMeta+A or Shift+2.',
  ],
  [
    'human.wait(milliseconds, signal?)',
    'Add a short presentation pause. Use Playwright assertions or locator waits for application readiness.',
  ],
  [
    'human.configure(appearance)',
    'Change cursor size and feedback while the script is running. For example, await human.configure({ scale: 4, textSelectionOpacity: 0.4 }).',
  ],
  [
    'human.dispose()',
    'Remove the cursor overlay and its listeners. Await any running action before cleanup. Your Playwright page stays open.',
  ],
];
export default function Docs() {
  return (
    <div className="shell grid gap-12 pt-14 lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="text-sm text-muted lg:sticky lg:top-8 lg:self-start">
        <nav aria-label="Documentation sections" className="flex flex-wrap gap-4 lg:flex-col">
          <Link href="/docs">Get started</Link>
          <a href="#api">API reference</a>
          <a href="#recording">Recording</a>
          <a href="#limits">Limitations</a>
        </nav>
      </aside>
      <article className="min-w-0 max-w-4xl">
        <h1 className="text-4xl font-semibold tracking-tight">Get started</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Add natural cursor movement and visible clicks to your Playwright scripts. Use the
          locators you already know. All cursor assets are bundled.
        </p>
        <div className="my-6">
          <CodeBlock
            label="Install"
            language="bash"
            code={'npm install humanette playwright\nnpx playwright install chromium'}
          />
        </div>
        <section id="automation">
          <h2 className="mb-4 mt-10 text-2xl font-semibold tracking-tight">
            Run your first script
          </h2>
          <p className="mb-5 text-sm leading-7 text-muted">
            Save this as demo.ts, replace the URL and locators with your app’s, then run{' '}
            <code>bun demo.ts</code>. This opens a visible browser and performs real input.
          </p>
          <CodeBlock code={setup} />
          <p className="mt-5 text-sm leading-7 text-muted">
            Await actions in order. Keep normal Playwright navigation, assertions, and app-readiness
            checks; use Humanette for the actions you want people to follow.
          </p>
        </section>
        <section id="api" className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">API reference</h2>
          <p className="my-5 text-sm leading-7 text-muted">
            Prefer <code>page.getByRole()</code>, <code>page.getByLabel()</code>, or{' '}
            <code>page.getByTestId()</code>. CSS selectors and manual coordinates work too.
            Durations are in milliseconds.
          </p>
          <CodeBlock
            code={
              "await human.click(page.getByRole('button', { name: 'Save' }));\nawait human.moveTo({ x: 320, y: 180 });\nawait human.drag({ x: 100, y: 200 }, { x: 600, y: 200 });"
            }
          />
          <div className="mt-6 divide-y divide-line border-y border-line">
            {api.map(([name, description]) => (
              <div key={name} className="py-5">
                <h3 className="break-words font-mono text-xs text-accent">{name}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-muted">
            Appearance options include scale, color, filled, motionBlur, textSelectionOpacity,
            pressRadius, pressDuration, pressOpacity, pressScale, holdRadius, holdOpacity,
            ringWidth, releaseRadius, and releaseDuration.{' '}
            <Link href="/workbench" className="text-link">
              Tune them in Pointer Lab
            </Link>
            .
          </p>
        </section>
        <section id="recording" className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Record with Playwright</h2>
          <p className="my-5 text-sm leading-7 text-muted">
            Playwright records the page, including Humanette’s cursor. This example saves to one
            fixed filename. Recording starts when the page is created, so navigation and loading are
            included; trim that lead-in for a finished product video.
          </p>
          <CodeBlock code={recording} />
          <p className="mt-5 text-sm leading-7 text-muted">
            The video above is explicitly 1280 × 800. A device scale factor of 2 does not make that
            video Retina resolution. Rehearse your script, avoid long pauses, and inspect the actual
            output before increasing resolution or frame rate.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            In this repository, run <code>bun dev</code>, then <code>bun example:playwright</code>.
            To watch without recording, use <code>bun example:playwright:headful</code>. Compare
            live movement with the recording before attributing stutter to input.
          </p>
        </section>
        <section id="limits" className="mt-12 border-t border-line pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Limitations</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Humanette is not a recorder and does not guarantee capture FPS. Input delivery and
            distinct captured frames depend on browser workload and the recorder. A high-FPS file
            can still contain repeated frames.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            Locators are measured before movement; targets that move during the approach can require
            another attempt. The adapter does not reproduce all of Playwright locator.click’s
            actionability checks. Text selection assumes ordinary left-to-right selectable content;
            use coordinates or keyboard commands for specialized editors.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">
            CSS cursor inference is limited across closed shadow roots, cross-origin frames, native
            controls, and custom cursor images. Busy cursors are static. No telemetry, recording
            uploads, or remote asset requests.
          </p>
        </section>
      </article>
    </div>
  );
}
