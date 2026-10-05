import Link from 'next/link';
import type { Metadata } from 'next';
import { Examples } from '../components/examples';
export const metadata: Metadata = { alternates: { canonical: '/' } };
export default function Home() {
  return (
    <div className="shell max-w-4xl!">
      <section className="pt-12 text-center">
        <h1 className="mx-auto max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Screen Studio for browser automation
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-balance text-base leading-7 text-muted">
          Humanette adds large cursors, natural mouse movement, and visible clicks to video captures
          made with Playwright.
        </p>
        <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-7 text-muted">
          Let coding agents show their work, or create repeatable product walkthroughs.
        </p>
        <Link href="/docs" className="primary mt-6 min-h-11 px-6 text-base">
          Getting started
        </Link>
      </section>
      <section id="examples" className="mt-12">
        <h1 className="text-3xl font-semibold tracking-tight">Examples</h1>
        <Examples />
      </section>
    </div>
  );
}
