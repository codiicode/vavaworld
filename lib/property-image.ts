'use client';

import bs58 from 'bs58';
import type { ActiveWallet } from './wallet-context';

/**
 * Set ONE image for a whole property (every hex claimed together). The
 * wallet signs a timestamped message; the server verifies ownership of
 * every hex before storing. Transfers clear the image via DB trigger.
 */
export async function uploadPropertyImage(
  wallet: ActiveWallet,
  h3s: string[],
  file: File,
): Promise<string> {
  const { address, message, signature } = await signAction(wallet, h3s.length);
  const form = new FormData();
  form.set('image', file);
  form.set('h3s', JSON.stringify(h3s));
  form.set('address', address);
  form.set('message', message);
  form.set('signature', signature);
  const r = await fetch('/api/property-image', { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? 'upload failed');
  return j.url as string;
}

export async function removePropertyImage(wallet: ActiveWallet, h3s: string[]): Promise<void> {
  const { address, message, signature } = await signAction(wallet, h3s.length);
  const r = await fetch('/api/property-image', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ h3s, address, message, signature }),
  });
  if (!r.ok) throw new Error((await r.json()).error ?? 'remove failed');
}

async function signAction(wallet: ActiveWallet, count: number) {
  if (!wallet.address || !wallet.signMessage) {
    throw new Error('Wallet cannot sign messages');
  }
  const message = `vava:property-image:${count}:ts=${Date.now()}`;
  const sig = await wallet.signMessage(new TextEncoder().encode(message));
  return { address: wallet.address, message, signature: bs58.encode(sig) };
}
