'use client';

import Link from 'next/link';
import { useActiveWallet } from '@/lib/active-wallet';
import { BrandMark } from './BrandMark';

/**
 * Fixed glassy top nav. CTAs change based on Privy session:
 *  - signed out → "Log in" + "Sign up" (both → /map?login=true to fire Privy modal)
 *  - signed in  → "Profile" → /profile
 *  - hydrating  → render placeholder shell so layout doesn't jump
 */
export function SiteNav() {
  const wallet = useActiveWallet();

  return (
    <nav className="l-site">
      <div className="l-nav-inner">
        <Link href="/" className="l-brand" aria-label="VAVAWORLD">
          <span className="l-mark"><BrandMark color="#ffffff" size={26} /></span>
          <span className="l-name">Vavaworld</span>
        </Link>

        <div className="l-nav-links">
          <Link href="/map">Buy land</Link>
          <Link href="/map">Marketplace</Link>
          <Link href="/map">Leaderboard</Link>
          <a href="#how">How it works</a>
        </div>

        <div className="l-nav-right">
          {!wallet.ready && <span style={{ width: 200 }} />}
          {wallet.ready && wallet.connected && (
            <Link href="/profile" className="l-btn l-btn-overlay-ghost">
              Profile
            </Link>
          )}
          {wallet.ready && !wallet.connected && (
            <>
              <Link href="/map?login=true" className="l-btn l-btn-text">Log in</Link>
              <Link href="/map?login=true" className="l-btn l-btn-overlay-ghost">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
