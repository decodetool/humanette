import Link from 'next/link';
import { HeroDemo } from '../components/hero-demo';
export default function Home() {
  return (
    <>
      <section className="shell pt-14 md:pt-24">
        <div className="grid items-end gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="eyebrow mb-6 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              THE MISSING HUMAN LAYER
            </p>
            <h1 className="font-display text-[clamp(54px,6.5vw,88px)] leading-[.99] tracking-[-.055em]">
              Automation.
              <br />
              With a little <em className="text-accent">feeling.</em>
            </h1>
          </div>
          <div className="max-w-md pb-2">
            <p className="text-lg leading-relaxed text-muted">
              Give your scripts a steady hand. Natural movement, legible cursors, and tiny moments
              of intention. Product demos people can actually follow.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/docs" className="primary">
                Meet your new pointer <span>↗</span>
              </Link>
              <Link href="/workbench" className="secondary">
                Open Pointer Lab
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1fr_270px]">
          <HeroDemo />
          <aside className="hidden lg:block">
            <span className="eyebrow">A LITTLE CHOREOGRAPHY</span>
            <ol className="mt-7 space-y-7">
              {[
                ['01', 'Go somewhere.', 'A seeded curve, not a teleport.'],
                ['02', 'Take a breath.', 'Slow down. Find the target.'],
                ['03', 'Make it clear.', 'Press, hold, release. Every gesture legible.'],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-4">
                  <span className="font-mono text-xs text-accent">{n}</span>
                  <div>
                    <h3 className="font-display text-xl">{t}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <code className="mt-9 block rounded-lg border border-line bg-white/40 p-4 text-xs">
              npm install humanette
            </code>
          </aside>
        </div>
      </section>
      <section className="shell mt-20 grid gap-7 border-t border-line pt-10 md:grid-cols-3">
        {[
          [
            'One script. Every take.',
            'Seeded motion and explicit timings. Rehearse once, replay without an agent thinking between steps.',
          ],
          [
            'Your cursor, in context.',
            'Bundled SVGs follow CSS cursor semantics. Correct hotspots, any scale, and a clear native comparison.',
          ],
          [
            'No particular puppeteer.',
            'Use the browser API, a script tag, or real Playwright input. React is optional. Your recorder stays yours.',
          ],
        ].map(([h, p]) => (
          <article key={h}>
            <h2 className="font-display text-2xl">{h}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{p}</p>
          </article>
        ))}
      </section>
      <section className="shell mt-24">
        <div className="grid overflow-hidden rounded-2xl bg-ink text-paper md:grid-cols-2">
          <div className="p-8 md:p-12">
            <span className="eyebrow text-[#a9bda2]!">SMALL API. BIG DIFFERENCE.</span>
            <h2 className="mt-5 font-display text-4xl">
              A human touch.
              <br />
              Not a human in the loop.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#b9c4b3]">
              Real actions when you need them. Visual playback when you don’t. The difference is
              explicit, and the feel is yours to tune.
            </p>
            <Link href="/docs" className="mt-7 inline-block text-sm text-[#e5ad91]">
              Explore the API ↗
            </Link>
          </div>
          <pre className="overflow-x-auto border-t border-white/10 p-8 font-mono text-xs leading-8 text-[#d7e4ca] md:border-t-0 md:border-l md:py-14">
            <code>
              {[
                "import { createHuman } from 'humanette/playwright';",
                '',
                'const human = await createHuman(page, {',
                '  scale: 2.5,',
                '  seed: 42,',
                '});',
                '',
                "await human.click('#new-board');",
                "await human.type('#title', 'Hello, world.');",
                "await human.drag('#card', '#done');",
                'await human.dispose();',
              ].join(String.fromCharCode(10))}
            </code>
          </pre>
        </div>
      </section>
    </>
  );
}
