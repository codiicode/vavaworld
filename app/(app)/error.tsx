'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Next.js client-side error boundary for the (app) route group. Replaces the
 * default white-screen "Application error" with a readable message + the actual
 * error, plus reset/home buttons.
 *
 * Anything that throws during render in /map or /profile lands here.
 */
export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[(app)/error.tsx] caught:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-6">
      <div className="flex max-w-lg flex-col items-center gap-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle size={24} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Something broke</h1>
          <p className="text-sm text-muted-foreground">
            We caught an exception before the whole page died. The error and
            full stack are logged to your browser console.
          </p>
        </div>
        <pre className="max-h-[200px] w-full overflow-auto rounded-md border border-border bg-muted px-3 py-2 text-left text-[11px] font-mono leading-relaxed text-foreground">
          {error.message || 'Unknown error'}
          {error.digest && `\n\ndigest: ${error.digest}`}
        </pre>
        <div className="flex gap-2">
          <Button onClick={reset} variant="default" size="sm">
            Try again
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
