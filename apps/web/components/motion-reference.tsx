'use client';

import { useEffect, useRef, useState } from 'react';

export function MotionReference() {
  const root = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [visible, setVisible] = useState(true);
  const [foreground, setForeground] = useState(true);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setEnabled(false);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root.current!);
    const onVisibility = () => setForeground(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <section
      ref={root}
      id="motion-reference"
      data-testid="motion-reference"
      data-running={enabled && visible && foreground}
      className="motion-reference mb-8 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Motion reference{' '}
          <span className="ml-2 font-mono text-[11px] font-normal text-muted">CSS only</span>
        </h2>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Animate reference
        </label>
      </div>
      <div aria-hidden="true" className="mt-3 flex items-center gap-6">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center">
          <div
            data-testid="motion-rotation"
            className="motion-rotation relative h-8 w-14 rounded-sm border-2 border-ink bg-accent"
          >
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-paper" />
          </div>
        </div>
        <div className="motion-track relative h-12 flex-1 overflow-hidden rounded-md border border-line">
          <div className="absolute inset-y-0 left-0 right-4">
            <div data-testid="motion-travel" className="motion-travel h-full w-full">
              <div className="h-full w-4 rounded-sm bg-ink" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        Constant speed: one rotation every 2s, one sweep every 2s. Independent of cursor playback.
      </p>
    </section>
  );
}
