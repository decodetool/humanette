import type { Metadata } from 'next';
import Link from 'next/link';
import { Examples } from '../../components/examples';
export const metadata: Metadata = { title: 'Examples', alternates: { canonical: '/examples' } };
export default function Page() {
  return (
    <div className="shell max-w-4xl! pt-12">
      <h1 className="text-4xl font-semibold tracking-tight">Examples</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Looping previews of clicks, text selection, and dragging. Run the code with your Playwright
        page.{' '}
        <Link href="/docs" className="text-link">
          Get started
        </Link>
        .
      </p>
      <Examples />
    </div>
  );
}
