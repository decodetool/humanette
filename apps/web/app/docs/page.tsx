import type { Metadata } from 'next';
import Link from 'next/link';
import { CodeBlock } from '../../components/code-block';
import { install, releaseNotice, setupPrompt, sourceInstall } from '../../content/agent-guide';
import { setup, recording, api } from '../../content/documentation';
export const metadata: Metadata = {
  title: 'Docs',
  description:
    'Set up Humanette with a coding-agent prompt or manual instructions. Learn the Playwright API, recording workflow, and limitations.',
  alternates: { canonical: '/docs', types: { 'text/markdown': '/docs.md' } },
};
export default function Docs() {
  return (
    <div className="shell grid gap-12 pt-14 lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="text-sm text-muted lg:sticky lg:top-8 lg:self-start">
        <nav aria-label="Documentation sections" className="flex flex-wrap gap-4 lg:flex-col">
          <Link href="/docs">Get started</Link>
          <a href="#agent-setup">Set up with an agent</a>
          <a href="#manual-install">Manual installation</a>
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
        <section id="agent-setup" className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Set up with your coding agent</h2>
          <p className="my-5 text-sm leading-7 text-muted">
            Copy this prompt into your coding agent. It will ask for your app and flow if needed,
            then add a runnable walkthrough. No skill installation is required.
          </p>
          <CodeBlock label="Setup prompt" language="text" code={setupPrompt} />
          <p className="mt-4 text-sm leading-7 text-muted">
            Agent-readable docs:{' '}
            <a href="/llms.txt" className="text-link">
              llms.txt
            </a>{' '}
            and{' '}
            <a href="/docs.md" className="text-link">
              the full Markdown guide
            </a>
            .
          </p>
        </section>
        <section id="manual-install" className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Manual installation</h2>
          <p className="my-5 text-sm leading-7 text-muted">{releaseNotice}</p>
          <p className="mb-5 text-sm leading-7 text-muted">
            Build the official repository with Bun 1.3.14. The package supports Node.js 22 or newer.
          </p>
          <CodeBlock label="Build package" language="bash" code={sourceInstall} />
          <p className="my-5 text-sm leading-7 text-muted">
            In your app, install the tarball printed by <code>npm pack</code>. Replace the example
            path and version with your generated file, and use your project’s package manager.
          </p>
          <CodeBlock label="Install" language="bash" code={install} />
        </section>
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
