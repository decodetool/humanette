'use client';
import dynamic from 'next/dynamic';
export const WorkbenchLoader = dynamic(() => import('./workbench').then((m) => m.Workbench), {
  ssr: false,
  loading: () => <p className="py-16 text-muted">Opening Pointer Lab…</p>,
});
