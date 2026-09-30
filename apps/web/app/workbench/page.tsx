import type { Metadata } from 'next';
import Link from 'next/link';
import { WorkbenchLoader } from '../../components/workbench-loader';
export const metadata: Metadata = { title: 'Pointer Lab', alternates: { canonical: '/workbench' } };
export default function Page() {
  return (
    <div className="shell pt-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">CONFIGURATION WORKBENCH</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Pointer Lab</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Choose a gesture, adjust the controls, and export your settings. This preview uses the
            same renderer as the package.
          </p>
        </div>
        <Link className="secondary" href="/examples/live#cursor-gallery">
          Cursors & hotspots ↗
        </Link>
      </div>
      <WorkbenchLoader />
    </div>
  );
}
