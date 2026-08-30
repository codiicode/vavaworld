'use client';

/**
 * Shared address → identity cache (username + verified X handle). Every
 * UserLink asks this store; unknown addresses are queued and resolved
 * against /api/usernames in a single debounced batch, so a whole
 * activity feed or leaderboard costs one request instead of N.
 * Subscribers re-render via useSyncExternalStore when their address
 * resolves.
 */

type Identity = { username: string | null; xHandle: string | null };

const cache = new Map<string, Identity>(); // present = looked up
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
    const json = (await res.json()) as {
      usernames?: Record<string, string>;
      x?: Record<string, string>;
    };
    const names = json.usernames ?? {};
    const x = json.x ?? {};
    for (const addr of batch) {
      cache.set(addr, { username: names[addr] ?? null, xHandle: x[addr] ?? null });
    }
  } catch {
    for (const addr of batch) cache.set(addr, { username: null, xHandle: null });
  }
  emit();
}

export function queueAddress(addr: string): void {
  if (cache.has(addr) || pending.has(addr)) return;
  pending.add(addr);
  if (!flushTimer) flushTimer = setTimeout(flush, 60);
}

export function getCachedUsername(addr: string): string | null | undefined {
  const id = cache.get(addr);
  return id === undefined ? undefined : id.username;
}

export function getCachedXHandle(addr: string): string | null | undefined {
  const id = cache.get(addr);
  return id === undefined ? undefined : id.xHandle;
}

/** Force the next lookup for an address to refetch (e.g. after verifying X). */
export function invalidateAddress(addr: string): void {
  cache.delete(addr);
}

export function subscribeUsernames(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
