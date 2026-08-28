'use client';

/**
 * Shared address → username cache. Every UserLink asks this store for a
 * name; unknown addresses are queued and resolved against
 * /api/usernames in a single debounced batch, so a whole activity feed
 * or leaderboard costs one request instead of N. Subscribers re-render
 * via useSyncExternalStore when their address resolves.
 */

const cache = new Map<string, string | null>(); // null = looked up, no username
const pending = new Set<string>();
const listeners = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

async function flush() {
  flushTimer = null;
  const batch = [...pending];
  pending.clear();
  if (batch.length === 0) return;
  try {
    const res = await fetch('/api/usernames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: batch }),
    });
    const json = (await res.json()) as { usernames?: Record<string, string> };
    const map = json.usernames ?? {};
    for (const addr of batch) cache.set(addr, map[addr] ?? null);
  } catch {
    for (const addr of batch) cache.set(addr, null);
  }
  emit();
}

export function queueAddress(addr: string): void {
  if (cache.has(addr) || pending.has(addr)) return;
  pending.add(addr);
  if (!flushTimer) flushTimer = setTimeout(flush, 60);
}

export function getCachedUsername(addr: string): string | null | undefined {
  return cache.get(addr);
}

export function subscribeUsernames(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
