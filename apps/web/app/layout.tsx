import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Humanette — a human touch for browser automation',
    template: '%s · Humanette',
  },
  description:
    'Natural pointer motion, beautifully legible cursors, and a workbench to make every product demonstration feel considered.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <header className="shell flex min-h-24 flex-wrap items-center justify-between gap-5 border-b border-line py-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight"
          >
            <span className="text-accent">↖</span>humanette<span className="text-accent">.</span>
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-5 text-xs md:gap-8">
            <Link href="/demos">Demos</Link>
            <Link href="/workbench">Pointer Lab</Link>
            <Link href="/docs">Documentation</Link>
            <a href="https://github.com/decodetool/humanette" className="border-b border-ink pb-1">
              GitHub ↗
            </a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="shell mt-24 flex flex-wrap justify-between gap-5 border-t border-line py-8 text-xs text-muted">
          <span>A little more human. A lot more understandable.</span>
          <span>
            Humanette / by Decode ·{' '}
            <a href="https://github.com/decodetool/humanette">Open source ↗</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
