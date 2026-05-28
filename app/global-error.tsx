'use client';

import { useEffect } from 'react';

/**
 * Root-level Next.js error boundary. Catches anything (app)/error.tsx misses -
 * specifically errors in the root layout itself (providers, fonts, polyfills).
 *
 * Intentionally minimal: no shadcn imports, no Tailwind utilities, no third-
 * party fonts. If a chunk failed to load this file is the last line of defense
 * before the generic prod fallback appears.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to console so we can read it during debug.
    // eslint-disable-next-line no-console
    console.error('[global-error] caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          margin: 0,
          padding: 0,
          background: '#fafafa',
          color: '#1a1b1f',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 520, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
            Something broke
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Full stack is in your browser console (F12 → Console).
          </p>
          <pre
            style={{
              textAlign: 'left',
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '8px 12px',
              maxHeight: 200,
              overflow: 'auto',
              marginBottom: 16,
            }}
          >
            {error.message || 'Unknown error'}
            {error.digest && `\n\ndigest: ${error.digest}`}
          </pre>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: '8px 14px',
                background: '#7CBFEC',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: '8px 14px',
                background: 'transparent',
                color: '#1a1b1f',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
