'use client';

import Link from 'next/link';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useActiveWallet } from '@/lib/active-wallet';

/**
 * Fixed glassy top nav. CTAs change based on session state:
 *  - signed out → "Log in" (Privy: email/Google/X) + "Connect wallet"
 *    (wallet-adapter: Phantom/Solflare/Backpack — no Privy involved).
 *  - signed in  → "Profile" → /profile
 *  - hydrating  → render placeholder shell so layout doesn't jump.
 */
export function SiteNav() {
  const wallet = useActiveWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  return (
    <nav className="l-site">
      <div className="l-nav-inner">
        <Link href="/" className="l-brand" aria-label="VAVAWORLD">
          <span className="l-mark">
            {/* White transparent mark — landing nav only. */}
            <img
              src="/logga transparent.png"
              alt="VAVAWORLD"
              width={34}
              height={34}
              style={{ width: 34, height: 34, objectFit: 'contain', display: 'block' }}
            />
          </span>
          <span className="l-name">Vavaworld</span>
        </Link>

        <div className="l-nav-links">
          <Link href="/map">Buy land</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <a href="#how">How it works</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Tokenomics</a>
        </div>

        <div className="l-nav-right">
          {!wallet.ready && <span style={{ width: 200 }} />}
          {wallet.ready && wallet.connected && (
            <Link href="/profile" className="l-btn l-btn-profile">
              Profile
            </Link>
          )}
          {wallet.ready && !wallet.connected && (
            <>
              <button
                type="button"
                onClick={wallet.login}
                className="l-btn l-btn-text"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openWalletModal(true)}
                className="l-btn l-btn-overlay-ghost"
              >
                Connect wallet
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
