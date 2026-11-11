import type { Metadata } from 'next';
import { ThemeProvider } from '../components/theme-provider';
import { SiteNav } from '../components/site-nav';
import { DemoAudioProvider } from '../components/demo-audio';
import { siteUrl } from '../content/site';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bigcursor · Readable cursors for browser automation',
    template: '%s · Bigcursor',
  },
  description:
    'Make your Playwright demos easier to follow with natural movement, large cursors, natural typing, and live click and keyboard sounds.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="describedby" href="/llms.txt" type="text/plain" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem('bigcursor-theme')}catch(e){}var v=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=v;try{localStorage.setItem('bigcursor-theme',v)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <DemoAudioProvider>
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <SiteNav />
            <main id="main">{children}</main>
            <footer className="shell mt-16 py-8 text-center text-base text-muted">
              Made with ❤️ by{' '}
              <a
                href="https://decode.dev"
                className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-accent"
              >
                Decode
              </a>
            </footer>
          </DemoAudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
