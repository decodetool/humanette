'use client';
import { useEffect, useRef, useState } from 'react';
import { Highlight, type PrismTheme } from 'prism-react-renderer';
import { Icon } from './icons';
const theme: PrismTheme = {
  plain: { color: 'var(--color-ink)' },
  styles: [
    { types: ['comment'], style: { color: 'var(--color-muted)' } },
    { types: ['keyword', 'operator'], style: { color: 'var(--syntax-keyword)' } },
    { types: ['string', 'attr-value'], style: { color: 'var(--syntax-string)' } },
    { types: ['function', 'class-name'], style: { color: 'var(--syntax-function)' } },
    { types: ['number', 'boolean'], style: { color: 'var(--color-accent)' } },
    { types: ['punctuation'], style: { color: 'var(--color-muted)' } },
  ],
};
export function CodeBlock({
  code,
  label = 'code',
  language = 'typescript',
  compact = !/[\r\n]/.test(code),
  wrap = language === 'text',
}: {
  code: string;
  label?: string;
  language?: 'typescript' | 'bash' | 'text';
  compact?: boolean;
  wrap?: boolean;
}) {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(code);
      setStatus('Copied');
      timer.current = setTimeout(() => setStatus(''), 1800);
    } catch {
      setStatus('Could not copy. Select the code to copy it manually.');
    }
  }
  return (
    <div className="code-block group relative min-w-0 overflow-hidden rounded-lg border border-line">
      <button
        onClick={copy}
        aria-label={`Copy ${label}`}
        title="Copy code"
        className={`copy-button icon-button absolute right-2 ${compact ? 'top-1/2 -translate-y-1/2' : 'top-2'} z-10 bg-surface ${status === 'Copied' ? 'text-success! opacity-100!' : ''}`}
      >
        <Icon name={status === 'Copied' ? 'check' : 'copy'} width="16" height="16" />
      </button>
      <span
        role="status"
        className={
          status && status !== 'Copied' ? 'block px-5 pt-3 text-xs text-danger' : 'sr-only'
        }
      >
        {status}
      </span>
      <Highlight theme={theme} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`overflow-x-auto ${compact ? 'px-3 py-2 leading-6' : 'p-5 leading-7'} pr-14 font-mono text-xs sm:text-[13px] ${wrap ? 'whitespace-pre-wrap break-words' : ''}`}
          >
            <code>
              {tokens.map((line, i) => (
                <div {...getLineProps({ line })} key={i}>
                  {line.map((token, key) => (
                    <span {...getTokenProps({ token })} key={key} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
