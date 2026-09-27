import type { Metadata } from 'next';
import { CursorTour } from '../../components/cursor-tour';
export const metadata: Metadata = { title: 'Live demos & cursor gallery' };
export default function Page() {
  return (
    <div className="shell pt-14">
      <p className="eyebrow">A FIELD GUIDE TO BETTER GESTURES</p>
      <h1 className="mt-4 font-display text-6xl tracking-tight">
        Take it for a spin<span className="text-accent">.</span>
      </h1>
      <p className="my-7 max-w-2xl text-base leading-7 text-muted">
        Click, select, and drag real content. Then compare the whole cursor vocabulary, one CSS
        keyword at a time.
      </p>
      <CursorTour />
    </div>
  );
}
