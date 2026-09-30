import type { Metadata } from 'next';
import { ThemeProvider } from '../components/theme-provider';
import { SiteNav } from '../components/site-nav';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Humanette · Readable cursors for browser automation',
    template: '%s · Humanette',
  },
  description:
    'Make your Playwright demos easier to follow with natural movement, large cursors, and visible clicks. TypeScript and cursor assets included.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem('humanette-theme')}catch(e){}var v=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=v;try{localStorage.setItem('humanette-theme',v)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <SiteNav />
          <main id="main">{children}</main>
          <footer className="shell mt-16 border-t border-line py-8 text-center text-base text-muted">
            Made with ❤️ by{' '}
            <a
              href="https://decode.dev"
              className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-accent"
            >
              Decode
            </a>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
