'use client';

/**
 * fetch that survives launch-day network flakes. A dropped request throws
 * TypeError("Failed to fetch") straight into the purchase dialog - retry
 * those, plus 429/5xx, with short backoff. Only use for requests that are
 * safe to repeat (quotes, price lookups, idempotent mirrors).
 */
export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(input, init);
      if ((r.status === 429 || r.status >= 502) && i < attempts - 1) {
        lastErr = new Error(`HTTP ${r.status}`);
      } else {
        return r;
      }
    } catch (e) {
      lastErr = e;
      if (i === attempts - 1) break;
    }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error('network error');
}
