import type { SVGProps } from 'react';
// Lucide icons, ISC license. Retrieved through Better Icons / Iconify.
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: 'sun' | 'moon' | 'github' | 'copy' | 'check' | 'play' | 'pause';
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {name === 'sun' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      )}
      {name === 'moon' && (
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
      )}
      {name === 'github' && (
        <>
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5c.08-1.25-.27-2.48-1-3.5c.28-1.15.28-2.35 0-3.5c0 0-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </>
      )}
      {name === 'copy' && (
        <>
          <rect width="14" height="14" x="8" y="8" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </>
      )}
      {name === 'check' && <path pathLength="1" className="copy-check" d="M20 6L9 17l-5-5" />}
      {name === 'play' && (
        <path
          fill="currentColor"
          stroke="none"
          d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
        />
      )}
      {name === 'pause' && (
        <>
          <rect fill="currentColor" stroke="none" width="5" height="18" x="14" y="3" rx="1" />
          <rect fill="currentColor" stroke="none" width="5" height="18" x="5" y="3" rx="1" />
        </>
      )}
    </svg>
  );
}
