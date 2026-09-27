import type { Metadata } from 'next';
import Link from 'next/link';
import { WorkbenchLoader } from '../../components/workbench-loader';
export const metadata: Metadata = { title: 'Pointer Lab' };
export default function Page() {
  return (
    <div className="shell pt-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">THE FEEL IS IN THE DETAILS</p>
          <h1 className="mt-4 font-display text-6xl tracking-tight">
            Pointer Lab<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Scrub a gesture. Tune the feedback. Take the exact configuration back to your next
            recording.
          </p>
        </div>
        <Link className="secondary" href="/demos#cursor-gallery">
          Cursors & hotspots ↗
        </Link>
      </div>
      <WorkbenchLoader />
    </div>
  );
}
