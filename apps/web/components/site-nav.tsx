'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './theme-provider';
import { Icon } from './icons';
export function SiteNav() {
  const pathname = usePathname();
  const { resolved, setTheme } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <header>
      <div className="shell flex min-h-18 items-center gap-3 py-4 sm:gap-6">
        <Link
          href="/"
          aria-label="Humanette home"
          className="mr-auto text-xl font-semibold tracking-tight"
        >
          humanette
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm sm:gap-6">
          {[
            ['/docs', 'Docs'],
            ['/examples', 'Examples'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname.startsWith(href) ? 'page' : undefined}
              className="nav-link"
            >
              {label}
            </Link>
          ))}
        </nav>
        <a
          href="https://github.com/decodetool/humanette"
          className="icon-button"
          aria-label="GitHub"
          title="GitHub"
        >
          <Icon name="github" />
        </a>
        <button
          className="icon-button"
          aria-label={`Switch to ${next} mode`}
          title={`Switch to ${next} mode`}
          onClick={() => setTheme(next)}
        >
          <Icon name={resolved === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  );
}
